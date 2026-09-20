import { firebaseConfig } from "./firebase-config.js";

import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   FIREBASE
========================================================= */

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

const root =
  document.getElementById("project");


/* =========================================================
   HELPERS
========================================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function getProjectId() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return params.get("id")?.trim() || null;
}


function getDate(value) {
  if (!value) return null;

  try {
    if (
      typeof value.toDate === "function"
    ) {
      return value.toDate();
    }

    const date =
      new Date(value);

    return isNaN(date.getTime())
      ? null
      : date;

  } catch {
    return null;
  }
}


function formatDate(value) {
  const date =
    getDate(value);

  if (!date) {
    return "No date";
  }

  return date.toLocaleDateString(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric"
    }
  );
}


function statusClass(status) {

  const value =
    String(status || "Pending")
      .toLowerCase()
      .trim();

  if (value === "completed")
    return "status-completed";

  if (value === "coding")
    return "status-coding";

  if (value === "review")
    return "status-review";

  if (value === "pending")
    return "status-pending";

  return "status-default";
}


/* =========================================================
   LOADING
========================================================= */

function showLoading() {

  if (!root) return;

  root.innerHTML = `
    <p class="muted">
      Loading project...
    </p>
  `;
}


/* =========================================================
   ERROR
========================================================= */

function showError(
  title,
  message,
  error = null
) {

  console.error(
    "WEBCRAFT PROJECT ERROR:",
    error
  );

  if (!root) return;

  root.innerHTML = `
    <div class="error-box">

      <strong>
        ${escapeHTML(title)}
      </strong>

      <p>
        ${escapeHTML(message)}
      </p>

      ${
        error?.code
          ? `
            <p class="muted">
              Firebase code:
              ${escapeHTML(error.code)}
            </p>
          `
          : ""
      }

      <button
        id="retryProject"
        class="btn"
        type="button">
        Try Again
      </button>

    </div>
  `;

  document
    .getElementById("retryProject")
    ?.addEventListener(
      "click",
      () => {

        const user =
          auth.currentUser;

        if (user) {
          loadProject(user);
        }

      }
    );
}


/* =========================================================
   LOAD FILES
========================================================= */

async function loadProjectFiles(
  projectId
) {

  const filesRef =
    collection(
      db,
      "projects",
      projectId,
      "files"
    );

  /*
    IMPORTANT:
    No orderBy().
    Files are sorted locally.
  */

  const snapshot =
    await getDocs(filesRef);

  const files = [];

  snapshot.forEach(
    (fileDoc) => {

      const data =
        fileDoc.data();

      files.push({
        id: fileDoc.id,
        data
      });

    }
  );


  files.sort(
    (a, b) => {

      const aDate =
        getDate(
          a.data.updatedAt ||
          a.data.createdAt
        );

      const bDate =
        getDate(
          b.data.updatedAt ||
          b.data.createdAt
        );

      return (
        (bDate?.getTime() || 0) -
        (aDate?.getTime() || 0)
      );

    }
  );


  return files;
}


/* =========================================================
   LOAD DESIGNS
========================================================= */

async function loadProjectDesigns(
  projectId
) {

  const designsRef =
    collection(
      db,
      "projects",
      projectId,
      "designs"
    );

  /*
    No orderBy().
  */

  const snapshot =
    await getDocs(designsRef);

  const designs = [];

  snapshot.forEach(
    (designDoc) => {

      designs.push({
        id: designDoc.id,
        data: designDoc.data()
      });

    }
  );


  return designs;
}


/* =========================================================
   DOWNLOAD WEBSITE
========================================================= */

async function downloadWebsite(
  projectId,
  projectName
) {

  const button =
    document.getElementById(
      "downloadProject"
    );

  if (button) {
    button.disabled = true;
    button.textContent =
      "Preparing download...";
  }


  try {

    /*
      Load actual code files
      from Firestore.
    */

    const files =
      await loadProjectFiles(
        projectId
      );


    const codeFiles =
      files.filter(
        (file) =>
          typeof file.data.content ===
          "string"
      );


    if (
      codeFiles.length === 0
    ) {

      throw new Error(
        "No website code has been saved yet."
      );

    }


    /*
      Load JSZip dynamically.
      This keeps the main page lightweight.
    */

    if (
      typeof window.JSZip ===
      "undefined"
    ) {

      await new Promise(
        (resolve, reject) => {

          const script =
            document.createElement(
              "script"
            );

          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";

          script.onload =
            resolve;

          script.onerror =
            () =>
              reject(
                new Error(
                  "Unable to load ZIP library."
                )
              );

          document.head.appendChild(
            script
          );

        }
      );

    }


    const zip =
      new window.JSZip();


    /*
      Add every code file.
    */

    codeFiles.forEach(
      (file) => {

        const data =
          file.data;

        const fileName =
          data.name ||
          data.fileName ||
          file.id;

        /*
          Only allow normal website
          file paths.
        */

        const safeName =
          String(fileName)
            .replace(/\\/g, "/")
            .replace(/^\/+/, "")
            .replace(/\.\.\//g, "");


        zip.file(
          safeName,
          data.content
        );

      }
    );


    /*
      Generate ZIP.
    */

    const blob =
      await zip.generateAsync({
        type: "blob"
      });


    /*
      Create browser download.
    */

    const url =
      URL.createObjectURL(
        blob
      );

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href =
      url;

    anchor.download =
      `${sanitizeFileName(
        projectName
      )}.zip`;

    document.body.appendChild(
      anchor
    );

    anchor.click();

    anchor.remove();

    setTimeout(
      () => {
        URL.revokeObjectURL(
          url
        );
      },
      1000
    );


    if (button) {

      button.disabled = false;

      button.textContent =
        "📦 Download Website";

    }

  } catch (error) {

    console.error(
      "DOWNLOAD ERROR:",
      error
    );


    if (button) {

      button.disabled = false;

      button.textContent =
        "📦 Download Website";

    }


    alert(
      error.message ||
      "Unable to create website ZIP."
    );

  }

}


/* =========================================================
   SAFE FILE NAME
========================================================= */

function sanitizeFileName(
  value
) {

  return String(
    value ||
    "WebCraft-Website"
  )
    .replace(
      /[<>:"/\\|?*\x00-\x1F]/g,
      ""
    )
    .trim()
    .replace(
      /\s+/g,
      "-"
    )
    .slice(
      0,
      80
    ) || "WebCraft-Website";
}


/* =========================================================
   RENDER PROJECT
========================================================= */

async function renderProject(
  projectId,
  data
) {

  const title =
    data.title ||
    data.name ||
    data.projectName ||
    "Untitled Website";


  const requirements =
    data.requirements ||
    data.description ||
    data.details ||
    "No requirements provided.";


  const status =
    data.status ||
    "Pending";


  let files = [];
  let designs = [];


  /*
    Load files.
  */

  try {

    files =
      await loadProjectFiles(
        projectId
      );

  } catch (error) {

    console.warn(
      "Files could not be loaded:",
      error
    );

  }


  /*
    Load designs.
  */

  try {

    designs =
      await loadProjectDesigns(
        projectId
      );

  } catch (error) {

    console.warn(
      "Designs could not be loaded:",
      error
    );

  }


  /* =======================================================
     FILE LIST
  ======================================================= */

  let filesHTML = "";


  if (
    files.length === 0
  ) {

    filesHTML = `
      <p class="muted">
        No files have been delivered yet.
      </p>
    `;

  } else {

    filesHTML =
      files
        .map(
          (file) => {

            const fileData =
              file.data;

            const fileName =
              fileData.name ||
              fileData.fileName ||
              file.id;


            return `
              <div
                class="project-file"
                style="
                  display:flex;
                  justify-content:space-between;
                  align-items:center;
                  gap:16px;
                  padding:14px 0;
                  border-bottom:1px solid rgba(255,255,255,.08);
                "
              >

                <div>

                  <strong>
                    ${escapeHTML(
                      fileName
                    )}
                  </strong>

                  ${
                    fileData.updatedAt
                      ? `
                        <p class="muted">
                          Updated:
                          ${escapeHTML(
                            formatDate(
                              fileData.updatedAt
                            )
                          )}
                        </p>
                      `
                      : ""
                  }

                </div>

              </div>
            `;

          }
        )
        .join("");

  }


  /* =======================================================
     DESIGN LIST
  ======================================================= */

  let designsHTML = "";


  if (
    designs.length === 0
  ) {

    designsHTML = `
      <p class="muted">
        No designs uploaded yet.
      </p>
    `;

  } else {

    designsHTML =
      designs
        .map(
          (design) => {

            const designData =
              design.data;

            const name =
              designData.name ||
              designData.title ||
              designData.fileName ||
              "Design";

            const image =
              designData.url ||
              designData.image ||
              designData.imageUrl ||
              designData.downloadURL ||
              "";


            return `
              <div
                style="
                  margin-bottom:20px;
                "
              >

                ${
                  image
                    ? `
                      <a
                        href="${escapeHTML(
                          image
                        )}"
                        target="_blank"
                        rel="noopener">

                        <img
                          src="${escapeHTML(
                            image
                          )}"
                          alt="${escapeHTML(
                            name
                          )}"
                          loading="lazy"
                          style="
                            width:100%;
                            max-width:700px;
                            border-radius:12px;
                            display:block;
                          "
                        >

                      </a>
                    `
                    : ""
                }

                <p>
                  <strong>
                    ${escapeHTML(
                      name
                    )}
                  </strong>
                </p>

              </div>
            `;

          }
        )
        .join("");

  }


  /* =======================================================
     DOWNLOAD BUTTON
  ======================================================= */

  const isCompleted =
    String(status)
      .toLowerCase()
      .trim() ===
    "completed";


  const downloadButton =
    isCompleted
      ? `
        <div
          style="
            margin:30px 0;
            padding:20px;
            border-radius:14px;
            border:1px solid rgba(255,215,0,.18);
          "
        >

          <h3>
            Your Website
          </h3>

          <p class="muted">
            Your website is complete.
            Download all saved website files as a ZIP.
          </p>

          <button
            id="downloadProject"
            class="btn"
            type="button">

            📦 Download Website

          </button>

        </div>
      `
      : `
        <div
          style="
            margin:30px 0;
            padding:20px;
            border-radius:14px;
          "
        >

          <h3>
            Website Delivery
          </h3>

          <p class="muted">
            The download button will appear here
            when your project is marked Completed.
          </p>

        </div>
      `;


  /* =======================================================
     MAIN HTML
  ======================================================= */

  root.innerHTML = `

    <div>

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:20px;
          flex-wrap:wrap;
          margin-bottom:30px;
        "
      >

        <div>

          <span class="section-label">
            PROJECT
          </span>

          <h2>
            ${escapeHTML(
              title
            )}
          </h2>

        </div>


        <span
          class="status-badge ${statusClass(
            status
          )}"
        >

          ${escapeHTML(
            status
          )}

        </span>

      </div>


      <div
        style="
          margin-bottom:30px;
        "
      >

        <h3>
          Requirements
        </h3>

        <p class="muted">
          ${escapeHTML(
            requirements
          )}
        </p>

      </div>


      <div
        class="project-meta"
        style="
          display:grid;
          gap:8px;
          margin-bottom:20px;
        "
      >

        <span>
          <strong>Project ID:</strong>
          ${escapeHTML(
            projectId
          )}
        </span>

        <span>
          <strong>Created:</strong>
          ${escapeHTML(
            formatDate(
              data.createdAt
            )
          )}
        </span>

        ${
          data.updatedAt
            ? `
              <span>
                <strong>Updated:</strong>
                ${escapeHTML(
                  formatDate(
                    data.updatedAt
                  )
                )}
              </span>
            `
            : ""
        }

      </div>


      ${downloadButton}


      <div
        style="
          margin-bottom:35px;
        "
      >

        <h3>
          Your Designs
        </h3>

        ${designsHTML}

      </div>


      <div>

        <h3>
          Website Files
        </h3>

        ${filesHTML}

      </div>


      <div
        style="
          margin-top:35px;
        "
      >

        <a
          class="btn"
          href="dashboard.html#projects">

          ← Back to My Projects

        </a>

      </div>

    </div>
  `;


  /* =======================================================
     DOWNLOAD BUTTON EVENT
  ======================================================= */

  if (isCompleted) {

    document
      .getElementById(
        "downloadProject"
      )
      ?.addEventListener(
        "click",
        () => {

          downloadWebsite(
            projectId,
            title
          );

        }
      );

  }

}


/* =========================================================
   LOAD PROJECT
========================================================= */

async function loadProject(
  user
) {

  showLoading();


  const projectId =
    getProjectId();


  /*
    No ID means user clicked
    "My project" directly.
  */

  if (!projectId) {

    window.location.href =
      "dashboard.html#projects";

    return;
  }


  try {

    console.log(
      "WEBCRAFT PROJECT"
    );

    console.log(
      "Logged-in UID:",
      user.uid
    );

    console.log(
      "Project ID:",
      projectId
    );


    /*
      DIRECT DOCUMENT LOOKUP.

      No query().
      No orderBy().
      No index needed.
    */

    const projectRef =
      doc(
        db,
        "projects",
        projectId
      );


    const snapshot =
      await getDoc(
        projectRef
      );


    if (!snapshot.exists()) {

      showError(
        "Project not found",
        "This project does not exist."
      );

      return;
    }


    const data =
      snapshot.data();


    /*
      SECURITY CHECK IN UI.

      Firestore Rules are still the
      real security layer.
    */

    if (
      data.clientId &&
      data.clientId !== user.uid
    ) {

      console.error(
        "PROJECT OWNER MISMATCH"
      );

      showError(
        "Access denied",
        "This project belongs to another client."
      );

      return;
    }


    await renderProject(
      projectId,
      data
    );


  } catch (error) {

    console.error(
      "PROJECT LOAD FAILED:",
      error
    );


    if (
      error.code ===
      "permission-denied"
    ) {

      showError(
        "Access denied",
        "You are not allowed to view this project.",
        error
      );

      return;
    }


    if (
      error.code ===
      "unauthenticated"
    ) {

      showError(
        "Not authenticated",
        "Please log in again.",
        error
      );

      return;
    }


    showError(
      "Unable to load project",
      "Something went wrong while loading your project.",
      error
    );

  }

}


/* =========================================================
   AUTH
========================================================= */

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      window.location.href =
        "../login.html";

      return;
    }


    try {

      await user.reload();

    } catch (error) {

      console.warn(
        "User reload failed:",
        error
      );

    }


    if (!user.emailVerified) {

      await signOut(auth);

      window.location.href =
        "../login.html";

      return;
    }


    await loadProject(
      user
    );

  }
);
