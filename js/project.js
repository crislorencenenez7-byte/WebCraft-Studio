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
   DOM HELPERS
========================================================= */

const $ = (id) => document.getElementById(id);

const logoutButton =
  $("logout");

const errorState =
  $("errorState");

const loadingState =
  $("loadingState");


/* =========================================================
   BASIC HELPERS
========================================================= */

function show(element) {
  if (!element) return;

  element.classList.remove("hidden");
  element.style.display = "";
}


function hide(element) {
  if (!element) return;

  element.classList.add("hidden");
  element.style.display = "none";
}


function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function getDateValue(value) {
  if (!value) return null;

  try {
    if (
      typeof value.toDate === "function"
    ) {
      return value.toDate();
    }

    if (
      value instanceof Date
    ) {
      return value;
    }

    const date =
      new Date(value);

    if (
      isNaN(date.getTime())
    ) {
      return null;
    }

    return date;

  } catch {
    return null;
  }
}


function formatDate(value) {
  const date =
    getDateValue(value);

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


function formatDateTime(value) {
  const date =
    getDateValue(value);

  if (!date) {
    return "No date";
  }

  return date.toLocaleString(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  );
}


function normalizeStatus(status) {
  return String(
    status || "Pending"
  )
    .trim()
    .toLowerCase();
}


function statusClass(status) {
  const value =
    normalizeStatus(status);

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
   URL PROJECT ID
========================================================= */

function getProjectId() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const id =
    params.get("id");

  if (!id) {
    console.error(
      "WEBCRAFT: No project ID in URL."
    );

    return null;
  }

  return id.trim();
}


/* =========================================================
   ERROR DISPLAY
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

  hide(loadingState);

  if (!errorState) {
    alert(message);
    return;
  }

  show(errorState);

  errorState.innerHTML = `
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

      ${
        error?.message
          ? `
            <p class="muted">
              ${escapeHTML(error.message)}
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

  $("retryProject")
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
   FIND ELEMENT BY MULTIPLE POSSIBLE IDS
========================================================= */

function findElement(...ids) {

  for (const id of ids) {

    const element =
      $(id);

    if (element) {
      return element;
    }
  }

  return null;
}


function setText(
  ids,
  value
) {

  const idList =
    Array.isArray(ids)
      ? ids
      : [ids];

  const element =
    findElement(...idList);

  if (element) {
    element.textContent =
      value ?? "";
  }
}


/* =========================================================
   RENDER BASIC PROJECT INFO
========================================================= */

function renderProject(
  projectId,
  data
) {

  hide(loadingState);
  hide(errorState);

  /*
    Support several common IDs so this JS
    remains compatible with the existing HTML.
  */

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

  const clientName =
    data.clientName ||
    data.client ||
    "Client";

  const clientEmail =
    data.clientEmail ||
    data.email ||
    "";

  /* -----------------------------------------
     TITLE
  ----------------------------------------- */

  setText(
    [
      "projectTitle",
      "projectName",
      "title"
    ],
    title
  );


  /* -----------------------------------------
     DESCRIPTION / REQUIREMENTS
  ----------------------------------------- */

  setText(
    [
      "projectDescription",
      "projectRequirements",
      "requirements",
      "description"
    ],
    description
  );


  /* -----------------------------------------
     STATUS
  ----------------------------------------- */

  const statusElements = [
    findElement(
      "projectStatus",
      "status"
    )
  ].filter(Boolean);

  statusElements.forEach(
    (element) => {

      element.textContent =
        status;

      element.classList.remove(
        "status-completed",
        "status-coding",
        "status-review",
        "status-pending",
        "status-default"
      );

      element.classList.add(
        statusClass(status)
      );
    }
  );


  /* -----------------------------------------
     CREATED DATE
  ----------------------------------------- */

  setText(
    [
      "projectCreated",
      "createdAt",
      "projectDate",
      "createdDate"
    ],
    formatDate(data.createdAt)
  );


  /* -----------------------------------------
     CLIENT
  ----------------------------------------- */

  setText(
    [
      "projectClient",
      "clientName"
    ],
    clientName
  );


  setText(
    [
      "projectClientEmail",
      "clientEmail"
    ],
    clientEmail
  );


  /* -----------------------------------------
     PROJECT ID
  ----------------------------------------- */

  setText(
    [
      "projectId",
      "projectID"
    ],
    projectId
  );


  /* -----------------------------------------
     OPTIONAL STATUS TIMESTAMPS
  ----------------------------------------- */

  setText(
    [
      "updatedAt",
      "projectUpdated"
    ],
    formatDateTime(data.updatedAt)
  );


  /* -----------------------------------------
     BODY DATA ATTRIBUTE
  ----------------------------------------- */

  document.body.dataset.projectId =
    projectId;


  document.body.dataset.projectStatus =
    status;


  console.log(
    "WEBCRAFT PROJECT LOADED:",
    {
      id: projectId,
      title,
      status,
      clientId: data.clientId
    }
  );
}


/* =========================================================
   LOAD PROJECT FILES
========================================================= */

async function loadProjectFiles(
  projectId
) {

  const container =
    findElement(
      "projectFiles",
      "filesList",
      "fileList",
      "files"
    );

  if (!container) {
    return;
  }

  container.innerHTML = `
    <p class="muted">
      Loading files...
    </p>
  `;

  try {

    const filesRef =
      collection(
        db,
        "projects",
        projectId,
        "files"
      );

    /*
      IMPORTANT:
      No orderBy() here.
      Therefore this does NOT require
      a Firestore index.
    */

    const snapshot =
      await getDocs(
        filesRef
      );

    if (snapshot.empty) {

      container.innerHTML = `
        <p class="muted">
          No files have been delivered yet.
        </p>
      `;

      return;
    }


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

        const aTime =
          getDateValue(
            a.data.createdAt
          )?.getTime() || 0;

        const bTime =
          getDateValue(
            b.data.createdAt
          )?.getTime() || 0;

        return bTime - aTime;
      }
    );


    container.innerHTML =
      files
        .map(
          (file) => {

            const data =
              file.data;

            const name =
              data.name ||
              data.fileName ||
              data.filename ||
              "Website File";

            const url =
              data.url ||
              data.downloadURL ||
              data.downloadUrl ||
              data.href ||
              "";


            return `
              <div class="project-file">

                <div>
                  <strong>
                    ${escapeHTML(name)}
                  </strong>

                  ${
                    data.createdAt
                      ? `
                        <p class="muted">
                          ${escapeHTML(
                            formatDate(
                              data.createdAt
                            )
                          )}
                        </p>
                      `
                      : ""
                  }
                </div>

                ${
                  url
                    ? `
                      <a
                        class="btn"
                        href="${escapeHTML(url)}"
                        target="_blank"
                        rel="noopener">
                        Open / Download →
                      </a>
                    `
                    : `
                      <span class="muted">
                        File link unavailable
                      </span>
                    `
                }

              </div>
            `;

          }
        )
        .join("");

  } catch (error) {

    console.error(
      "PROJECT FILES ERROR:",
      error
    );

    container.innerHTML = `
      <p class="muted">
        Unable to load project files.
      </p>
    `;
  }
}


/* =========================================================
   LOAD PROJECT DESIGNS
========================================================= */

async function loadProjectDesigns(
  projectId
) {

  const container =
    findElement(
      "projectDesigns",
      "designsList",
      "designList",
      "designs"
    );

  if (!container) {
    return;
  }

  container.innerHTML = `
    <p class="muted">
      Loading designs...
    </p>
  `;


  try {

    const designsRef =
      collection(
        db,
        "projects",
        projectId,
        "designs"
      );

    /*
      No orderBy().
      Sort locally instead.
    */

    const snapshot =
      await getDocs(
        designsRef
      );


    if (snapshot.empty) {

      container.innerHTML = `
        <p class="muted">
          No designs uploaded yet.
        </p>
      `;

      return;
    }


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

        const aTime =
          getDateValue(
            a.data.createdAt
          )?.getTime() || 0;

        const bTime =
          getDateValue(
            b.data.createdAt
          )?.getTime() || 0;

        return bTime - aTime;
      }
    );


    container.innerHTML =
      designs
        .map(
          (design) => {

            const data =
              design.data;

            const name =
              data.name ||
              data.title ||
              data.fileName ||
              "Design";

            const image =
              data.url ||
              data.image ||
              data.imageUrl ||
              data.downloadURL ||
              "";


            return `
              <div class="project-design">

                ${
                  image
                    ? `
                      <a
                        href="${escapeHTML(image)}"
                        target="_blank"
                        rel="noopener">

                        <img
                          src="${escapeHTML(image)}"
                          alt="${escapeHTML(name)}"
                          loading="lazy">

                      </a>
                    `
                    : `
                      <div class="muted">
                        No preview available
                      </div>
                    `
                }

                <h4>
                  ${escapeHTML(name)}
                </h4>

              </div>
            `;

          }
        )
        .join("");

  } catch (error) {

    console.error(
      "PROJECT DESIGNS ERROR:",
      error
    );

    container.innerHTML = `
      <p class="muted">
        Unable to load project designs.
      </p>
    `;
  }
}


/* =========================================================
   LOAD PROJECT
========================================================= */

async function loadProject(
  user
) {

  show(loadingState);
  hide(errorState);

  const projectId =
    getProjectId();


  /* -----------------------------------------
     NO ID
  ----------------------------------------- */

  if (!projectId) {

    showError(
      "Project not found",
      "The project ID is missing from the URL."
    );

    return;
  }


  /* -----------------------------------------
     AUTH CHECK
  ----------------------------------------- */

  if (!user) {

    window.location.href =
      "../login.html";

    return;
  }


  console.log(
    "================================"
  );

  console.log(
    "WEBCRAFT PROJECT PAGE"
  );

  console.log(
    "User UID:",
    user.uid
  );

  console.log(
    "Project ID:",
    projectId
  );

  console.log(
    "================================"
  );


  try {

    /*
      IMPORTANT:
      Direct document lookup.

      This is:

      projects/{projectId}

      NOT:

      query(...)
      orderBy(...)
      where(...)
      
      Therefore there is no composite
      index requirement for this lookup.
    */

    const projectRef =
      doc(
        db,
        "projects",
        projectId
      );


    const projectSnapshot =
      await getDoc(
        projectRef
      );


    /* -----------------------------------------
       PROJECT DOES NOT EXIST
    ----------------------------------------- */

    if (!projectSnapshot.exists()) {

      showError(
        "Project not found",
        "This project does not exist in Firestore."
      );

      return;
    }


    const data =
      projectSnapshot.data();


    console.log(
      "Project data:",
      data
    );


    /* -----------------------------------------
       SECURITY CHECK
    ----------------------------------------- */

    /*
      Client users can only view their own
      projects according to the Firestore Rules.

      We also check clientId here so that the
      UI does not accidentally display another
      user's project if rules/data are incorrect.
    */

    const role =
      String(
        data.clientRole ||
        ""
      )
        .toLowerCase()
        .trim();


    const projectOwner =
      data.clientId ||
      data.userId ||
      data.ownerId;


    /*
      If clientId exists and doesn't match
      the logged-in user, don't render it.
    */

    if (
      projectOwner &&
      projectOwner !== user.uid
    ) {

      console.error(
        "PROJECT OWNER MISMATCH",
        {
          projectOwner,
          loggedInUser: user.uid
        }
      );

      showError(
        "Access denied",
        "This project does not belong to your account."
      );

      return;
    }


    /* -----------------------------------------
       RENDER
    ----------------------------------------- */

    renderProject(
      projectId,
      data
    );


    /* -----------------------------------------
       SUBCOLLECTIONS
    ----------------------------------------- */

    await Promise.all([
      loadProjectFiles(
        projectId
      ),
      loadProjectDesigns(
        projectId
      )
    ]);


  } catch (error) {

    console.error(
      "================================"
    );

    console.error(
      "WEBCRAFT PROJECT LOAD FAILED"
    );

    console.error(
      "Project ID:",
      projectId
    );

    console.error(
      "UID:",
      user.uid
    );

    console.error(
      "Firebase code:",
      error?.code
    );

    console.error(
      "Firebase message:",
      error?.message
    );

    console.error(
      error
    );

    console.error(
      "================================"
    );


    if (
      error?.code ===
      "permission-denied"
    ) {

      showError(
        "Permission denied",
        "Firestore Rules are preventing this account from reading this project.",
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
        "Your Firebase login session is no longer valid. Please log in again.",
        error
      );

      return;
    }


    if (
      error?.code ===
      "not-found"
    ) {

      showError(
        "Project not found",
        "Firestore could not find this project.",
        error
      );

      return;
    }


    showError(
      "Unable to load project",
      "Something went wrong while loading this project.",
      error
    );
  }
}


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      window.location.href =
        "../login.html";

      return;
    }


    /*
      Refresh Firebase user information.
    */

    try {

      await user.reload();

    } catch (error) {

      console.warn(
        "Firebase user reload failed:",
        error
      );
    }


    /*
      Require verified email.
    */

    if (!user.emailVerified) {

      console.warn(
        "Email is not verified."
      );

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


/* =========================================================
   LOGOUT
========================================================= */

if (logoutButton) {

  logoutButton.addEventListener(
    "click",
    async () => {

      try {

        await signOut(
          auth
        );

        window.location.href =
          "../login.html";

      } catch (error) {

        console.error(
          "Logout error:",
          error
        );

      }

    }
  );
}
