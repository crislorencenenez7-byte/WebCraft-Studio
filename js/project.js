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


/* =========================================================
   DOM
========================================================= */

const projectContainer =
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


function getDate(value) {
  if (!value) return null;

  try {
    if (typeof value.toDate === "function") {
      return value.toDate();
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return null;
    }

    return date;

  } catch {
    return null;
  }
}


function formatDate(value) {
  const date = getDate(value);

  if (!date) {
    return "No date";
  }

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}


function getStatusClass(status) {

  const value =
    String(status || "Pending")
      .toLowerCase()
      .trim();

  if (value === "completed") {
    return "status-completed";
  }

  if (value === "coding") {
    return "status-coding";
  }

  if (value === "review") {
    return "status-review";
  }

  if (value === "pending") {
    return "status-pending";
  }

  return "status-default";
}


/* =========================================================
   PROJECT ID
========================================================= */

function getProjectId() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  return params.get("id")?.trim() || null;
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

  if (!projectContainer) {
    return;
  }

  projectContainer.innerHTML = `
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
        const user = auth.currentUser;

        if (user) {
          loadProject(user);
        }
      }
    );
}


/* =========================================================
   LOADING
========================================================= */

function showLoading() {

  if (!projectContainer) {
    return;
  }

  projectContainer.innerHTML = `
    <div class="loading-state">

      <p class="muted">
        Loading project...
      </p>

    </div>
  `;
}


/* =========================================================
   LOAD FILES
========================================================= */

async function loadFiles(projectId) {

  const filesRef =
    collection(
      db,
      "projects",
      projectId,
      "files"
    );

  const snapshot =
    await getDocs(filesRef);

  const files = [];

  snapshot.forEach(
    (fileDoc) => {

      files.push({
        id: fileDoc.id,
        data: fileDoc.data()
      });

    }
  );


  files.sort(
    (a, b) => {

      const aDate =
        getDate(a.data.createdAt);

      const bDate =
        getDate(b.data.createdAt);

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

async function loadDesigns(projectId) {

  const designsRef =
    collection(
      db,
      "projects",
      projectId,
      "designs"
    );

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


  designs.sort(
    (a, b) => {

      const aDate =
        getDate(a.data.createdAt);

      const bDate =
        getDate(b.data.createdAt);

      return (
        (bDate?.getTime() || 0) -
        (aDate?.getTime() || 0)
      );

    }
  );


  return designs;
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

  const description =
    data.description ||
    data.requirements ||
    data.details ||
    "No requirements provided.";

  const status =
    data.status ||
    "Pending";


  let files = [];
  let designs = [];


  /*
    Load subcollections separately.

    If one fails, the main project can
    still be displayed.
  */

  try {
    files =
      await loadFiles(projectId);
  } catch (error) {

    console.warn(
      "Unable to load files:",
      error
    );

  }


  try {
    designs =
      await loadDesigns(projectId);
  } catch (error) {

    console.warn(
      "Unable to load designs:",
      error
    );

  }


  if (!projectContainer) {
    return;
  }


  /* =======================================================
     FILES HTML
  ======================================================= */

  let filesHTML = "";

  if (files.length === 0) {

    filesHTML = `
      <p class="muted">
        No files have been delivered yet.
      </p>
    `;

  } else {

    filesHTML =
      files
        .map((file) => {

          const fileData =
            file.data;

          const fileName =
            fileData.name ||
            fileData.fileName ||
            fileData.filename ||
            "Website File";

          const fileURL =
            fileData.url ||
            fileData.downloadURL ||
            fileData.downloadUrl ||
            fileData.href ||
            "";


          return `
            <div class="project-file"
              style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:16px;
                padding:14px 0;
                border-bottom:1px solid rgba(255,255,255,.08);
              ">

              <div>

                <strong>
                  ${escapeHTML(fileName)}
                </strong>

                ${
                  fileData.createdAt
                    ? `
                      <p class="muted">
                        ${escapeHTML(
                          formatDate(
                            fileData.createdAt
                          )
                        )}
                      </p>
                    `
                    : ""
                }

              </div>

              ${
                fileURL
                  ? `
                    <a
                      class="btn"
                      href="${escapeHTML(fileURL)}"
                      target="_blank"
                      rel="noopener">
                      Open →
                    </a>
                  `
                  : `
                    <span class="muted">
                      No download link
                    </span>
                  `
              }

            </div>
          `;

        })
        .join("");

  }


  /* =======================================================
     DESIGNS HTML
  ======================================================= */

  let designsHTML = "";

  if (designs.length === 0) {

    designsHTML = `
      <p class="muted">
        No designs uploaded yet.
      </p>
    `;

  } else {

    designsHTML =
      designs
        .map((design) => {

          const designData =
            design.data;

          const name =
            designData.name ||
            designData.title ||
            designData.fileName ||
            "Design";

          const imageURL =
            designData.url ||
            designData.image ||
            designData.imageUrl ||
            designData.downloadURL ||
            "";


          return `
            <div
              style="
                margin-bottom:20px;
              ">

              ${
                imageURL
                  ? `
                    <a
                      href="${escapeHTML(imageURL)}"
                      target="_blank"
                      rel="noopener">

                      <img
                        src="${escapeHTML(imageURL)}"
                        alt="${escapeHTML(name)}"
                        loading="lazy"
                        style="
                          width:100%;
                          max-width:700px;
                          border-radius:12px;
                          display:block;
                        ">

                    </a>
                  `
                  : ""
              }

              <p>
                <strong>
                  ${escapeHTML(name)}
                </strong>
              </p>

            </div>
          `;

        })
        .join("");

  }


  /* =======================================================
     MAIN PROJECT PAGE
  ======================================================= */

  projectContainer.innerHTML = `

    <div>

      <!-- PROJECT HEADER -->

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:20px;
          flex-wrap:wrap;
          margin-bottom:30px;
        ">

        <div>

          <span class="section-label">
            PROJECT
          </span>

          <h2>
            ${escapeHTML(title)}
          </h2>

        </div>

        <span
          class="status-badge ${getStatusClass(status)}">

          ${escapeHTML(status)}

        </span>

      </div>


      <!-- PROJECT DETAILS -->

      <div
        style="
          margin-bottom:30px;
        ">

        <h3>
          Requirements
        </h3>

        <p class="muted">
          ${escapeHTML(description)}
        </p>

      </div>


      <!-- PROJECT META -->

      <div
        class="project-meta"
        style="
          display:grid;
          gap:8px;
          margin-bottom:30px;
        ">

        <span>
          <strong>Project ID:</strong>
          ${escapeHTML(projectId)}
        </span>

        <span>
          <strong>Created:</strong>
          ${escapeHTML(
            formatDate(data.createdAt)
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


      <!-- DESIGNS -->

      <div
        style="
          margin-bottom:35px;
        ">

        <h3>
          Your Designs
        </h3>

        ${designsHTML}

      </div>


      <!-- FILES -->

      <div>

        <h3>
          Delivered Files
        </h3>

        ${filesHTML}

      </div>


      <!-- BACK -->

      <div
        style="
          margin-top:35px;
        ">

        <a
          class="btn"
          href="dashboard.html#projects">

          ← Back to My Projects

        </a>

      </div>

    </div>
  `;
}


/* =========================================================
   LOAD PROJECT
========================================================= */

async function loadProject(user) {

  showLoading();


  const projectId =
    getProjectId();


  /* -------------------------------------------------------
     NO PROJECT ID
  ------------------------------------------------------- */

  if (!projectId) {

    /*
      If the user clicked "My project" directly,
      return to the project list instead of showing
      a confusing Firebase error.
    */

    window.location.href =
      "dashboard.html#projects";

    return;
  }


  try {

    console.log(
      "WEBCRAFT PROJECT"
    );

    console.log(
      "UID:",
      user.uid
    );

    console.log(
      "Project ID:",
      projectId
    );


    /* -----------------------------------------------------
       DIRECT FIRESTORE LOOKUP
    ----------------------------------------------------- */

    const projectRef =
      doc(
        db,
        "projects",
        projectId
      );


    const snapshot =
      await getDoc(projectRef);


    if (!snapshot.exists()) {

      showError(
        "Project not found",
        "This project does not exist in Firestore."
      );

      return;
    }


    const data =
      snapshot.data();


    /* -----------------------------------------------------
       OWNER CHECK
    ----------------------------------------------------- */

    const ownerId =
      data.clientId ||
      data.userId ||
      data.ownerId;


    if (
      ownerId &&
      ownerId !== user.uid
    ) {

      showError(
        "Access denied",
        "This project does not belong to your account."
      );

      return;
    }


    /* -----------------------------------------------------
       RENDER
    ----------------------------------------------------- */

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
      error?.code ===
      "permission-denied"
    ) {

      showError(
        "Permission denied",
        "Firestore Rules are blocking access to this project.",
        error
      );

      return;
    }


    if (
      error?.code ===
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


    await loadProject(user);

  }
);


/* =========================================================
   LOGOUT
========================================================= */

const logoutButton =
  document.getElementById("logout");

if (logoutButton) {

  logoutButton.addEventListener(
    "click",
    async () => {

      try {

        await signOut(auth);

        window.location.href =
          "../login.html";

      } catch (error) {

        console.error(
          "Logout failed:",
          error
        );

      }

    }
  );
}
