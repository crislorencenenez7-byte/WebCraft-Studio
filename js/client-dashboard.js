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
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================
   FIREBASE INITIALIZATION
========================================= */

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


/* =========================================
   PAGE ELEMENTS
========================================= */

const clientName =
  document.getElementById("clientName");

const clientEmail =
  document.getElementById("clientEmail");

const loadingState =
  document.getElementById("loadingState");

const errorState =
  document.getElementById("errorState");

const emptyState =
  document.getElementById("emptyState");

const projectList =
  document.getElementById("projectList");

const logoutButton =
  document.getElementById("logout");


/* =========================================
   UI HELPERS
========================================= */

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


function formatDate(value) {

  if (!value) {
    return "No date";
  }

  try {

    let date;

    if (
      value &&
      typeof value.toDate === "function"
    ) {

      date = value.toDate();

    } else {

      date = new Date(value);

    }

    if (isNaN(date.getTime())) {
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

  } catch {

    return "No date";

  }

}


function getStatusClass(status) {

  const value =
    String(status || "Pending")
      .toLowerCase()
      .trim();

  switch (value) {

    case "completed":
      return "status-completed";

    case "coding":
      return "status-coding";

    case "review":
      return "status-review";

    case "pending":
      return "status-pending";

    default:
      return "status-default";

  }

}


/* =========================================
   DISPLAY USER
========================================= */

function displayUser(user) {

  if (clientName) {

    clientName.textContent =
      user.displayName ||
      user.email?.split("@")[0] ||
      "Client";

  }

  if (clientEmail) {

    clientEmail.textContent =
      user.email || "";

  }

}


/* =========================================
   ADMIN DASHBOARD LINK
========================================= */

function addAdminLink() {

  const nav =
    document.querySelector(
      "header nav"
    );

  if (!nav) return;


  if (
    document.getElementById(
      "adminDashboardLink"
    )
  ) {

    return;

  }


  const link =
    document.createElement("a");

  link.id =
    "adminDashboardLink";

  link.href =
    "../admin/dashboard.html";

  link.textContent =
    "Admin Dashboard";


  if (logoutButton) {

    nav.insertBefore(
      link,
      logoutButton
    );

  } else {

    nav.appendChild(link);

  }

}


/* =========================================
   GET USER ROLE
========================================= */

async function getUserRole(user) {

  try {

    const userRef =
      doc(
        db,
        "users",
        user.uid
      );


    const userSnapshot =
      await getDoc(userRef);


    if (!userSnapshot.exists()) {

      console.warn(
        "No users/" +
        user.uid +
        " document found."
      );

      return "client";

    }


    const userData =
      userSnapshot.data();


    const role =
      String(
        userData.role || "client"
      )
      .toLowerCase()
      .trim();


    console.log(
      "WebCraft user role:",
      role
    );


    return role;

  } catch (error) {

    console.error(
      "ROLE CHECK ERROR:",
      error
    );

    return "client";

  }

}


/* =========================================
   CREATE PROJECT CARD
========================================= */

function createProjectCard(
  projectId,
  data
) {

  const title =
    data.title ||
    data.projectName ||
    data.name ||
    "Untitled Website";


  const description =
    data.description ||
    data.requirements ||
    "Website project";


  const status =
    data.status ||
    "Pending";


  const card =
    document.createElement(
      "article"
    );


  card.className =
    "project-card";


  card.innerHTML = `

    <div class="project-card-top">

      <div>

        <h3>
          ${escapeHTML(title)}
        </h3>

        <p class="project-description">
          ${escapeHTML(description)}
        </p>

      </div>


      <span
        class="status-badge ${getStatusClass(status)}">

        ${escapeHTML(status)}

      </span>

    </div>


    <div class="project-meta">

      <span>

        Created:
        ${escapeHTML(
          formatDate(data.createdAt)
        )}

      </span>

    </div>


    <div class="project-actions">

      <a
        class="btn"
        href="project.html?id=${encodeURIComponent(
          projectId
        )}">

        Track Project →

      </a>

    </div>

  `;


  return card;

}


/* =========================================
   LOAD PROJECTS
========================================= */

async function loadProjects(
  user,
  role
) {

  show(loadingState);

  hide(errorState);

  hide(emptyState);


  if (projectList) {

    projectList.innerHTML = "";

  }


  console.log(
    "================================"
  );

  console.log(
    "WEBCRAFT PROJECT LOADER"
  );

  console.log(
    "UID:",
    user.uid
  );

  console.log(
    "ROLE:",
    role
  );

  console.log(
    "================================"
  );


  try {

    const projectsCollection =
      collection(
        db,
        "projects"
      );


    let snapshot;


    /* =====================================
       ADMIN
    ===================================== */

    if (role === "admin") {

      console.log(
        "ADMIN MODE"
      );

      console.log(
        "Loading ALL projects..."
      );


      /*
       * No where()
       * No orderBy()
       * No composite index.
       */

      snapshot =
        await getDocs(
          projectsCollection
        );

    }


    /* =====================================
       CLIENT
    ===================================== */

    else {

      console.log(
        "CLIENT MODE"
      );

      console.log(
        "Loading projects for UID:",
        user.uid
      );


      const projectsQuery =
        query(
          projectsCollection,
          where(
            "clientId",
            "==",
            user.uid
          )
        );


      snapshot =
        await getDocs(
          projectsQuery
        );

    }


    console.log(
      "Firestore request successful."
    );

    console.log(
      "Projects found:",
      snapshot.size
    );


    hide(loadingState);


    /* =====================================
       NO PROJECTS
    ===================================== */

    if (snapshot.empty) {

      show(emptyState);

      console.log(
        "No projects found."
      );

      return;

    }


    /* =====================================
       CONVERT SNAPSHOT
    ===================================== */

    const projects = [];


    snapshot.forEach(
      (projectDoc) => {

        const data =
          projectDoc.data();


        console.log(
          "PROJECT:",
          projectDoc.id,
          data
        );


        projects.push({

          id:
            projectDoc.id,

          data:
            data

        });

      }
    );


    /* =====================================
       SORT BY DATE
    ===================================== */

    projects.sort(
      (a, b) => {

        const aTime =
          a.data.createdAt &&
          typeof a.data.createdAt.toMillis ===
            "function"
            ? a.data.createdAt.toMillis()
            : 0;


        const bTime =
          b.data.createdAt &&
          typeof b.data.createdAt.toMillis ===
            "function"
            ? b.data.createdAt.toMillis()
            : 0;


        return bTime - aTime;

      }
    );


    /* =====================================
       RENDER
    ===================================== */

    projects.forEach(
      (project) => {

        const card =
          createProjectCard(
            project.id,
            project.data
          );


        if (projectList) {

          projectList.appendChild(
            card
          );

        }

      }
    );


  } catch (error) {

    console.error(
      "================================"
    );

    console.error(
      "WEBCRAFT FIRESTORE ERROR"
    );

    console.error(
      "ERROR CODE:",
      error.code
    );

    console.error(
      "ERROR MESSAGE:",
      error.message
    );

    console.error(
      "FULL ERROR:",
      error
    );

    console.error(
      "================================"
    );


    hide(loadingState);

    hide(emptyState);

    show(errorState);


    let message =
      "Unable to load your projects.";


    if (
      error.code ===
      "permission-denied"
    ) {

      message =
        "Firestore permission denied. Check the user's role and project ownership.";

    }


    else if (
      error.code ===
      "failed-precondition"
    ) {

      message =
        "Firestore failed the request. Check your Firestore configuration or index.";

    }


    else if (
      error.code ===
      "unauthenticated"
    ) {

      message =
        "You are not authenticated. Please log in again.";

    }


    else if (
      error.code ===
      "not-found"
    ) {

      message =
        "The Firestore database or collection could not be found.";

    }


    else if (
      error.code ===
      "unavailable"
    ) {

      message =
        "Firebase is temporarily unavailable. Please try again.";

    }


    else if (
      error.message
    ) {

      message =
        error.message;

    }


    errorState.innerHTML = `

      <div class="error-box">

        <strong>
          Unable to load projects
        </strong>


        <p>
          ${escapeHTML(message)}
        </p>


        <p class="muted">

          Firebase error:
          ${escapeHTML(
            error.code ||
            "unknown"
          )}

        </p>


        <p class="muted">

          UID:
          ${escapeHTML(
            user.uid
          )}

        </p>


        <p class="muted">

          Role:
          ${escapeHTML(
            role
          )}

        </p>


        <button
          class="btn"
          id="retryProjects"
          type="button">

          Try Again

        </button>

      </div>

    `;


    const retry =
      document.getElementById(
        "retryProjects"
      );


    if (retry) {

      retry.addEventListener(
        "click",
        () => {

          loadProjects(
            user,
            role
          );

        }
      );

    }

  }

}


/* =========================================
   AUTH STATE
========================================= */

onAuthStateChanged(
  auth,
  async (user) => {

    /*
     * Not logged in
     */

    if (!user) {

      window.location.href =
        "../login.html";

      return;

    }


    console.log(
      "================================"
    );

    console.log(
      "WEBCRAFT AUTH"
    );

    console.log(
      "Logged in:",
      user.email
    );

    console.log(
      "UID:",
      user.uid
    );

    console.log(
      "Email verified:",
      user.emailVerified
    );

    console.log(
      "================================"
    );


    /*
     * Display account
     */

    displayUser(user);


    /*
     * Get Firestore role
     */

    const role =
      await getUserRole(
        user
      );


    console.log(
      "FINAL ROLE:",
      role
    );


    /*
     * Admin navigation
     */

    if (
      role === "admin"
    ) {

      addAdminLink();

    }


    /*
     * Load projects
     */

    await loadProjects(
      user,
      role
    );

  }
);


/* =========================================
   LOGOUT
========================================= */

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
          "LOGOUT ERROR:",
          error
        );


        alert(
          "Unable to log out."
        );

      }

    }
  );

}
