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
   FIREBASE
========================================= */

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


/* =========================================
   ELEMENTS
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
   UI
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
    return "Pending";
  }

  try {

    const date =
      typeof value.toDate === "function"
        ? value.toDate()
        : new Date(value);

    if (isNaN(date.getTime())) {
      return "Pending";
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

    return "Pending";

  }

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


/* =========================================
   USER DISPLAY
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
   GET ROLE
========================================= */

async function getUserRole(user) {

  const userRef =
    doc(
      db,
      "users",
      user.uid
    );

  const snapshot =
    await getDoc(userRef);

  if (!snapshot.exists()) {

    console.warn(
      "users/" +
      user.uid +
      " does not exist."
    );

    return "client";

  }

  const data =
    snapshot.data();

  const role =
    String(
      data.role || "client"
    )
    .toLowerCase()
    .trim();

  console.log(
    "Firestore role:",
    role
  );

  return role;

}


/* =========================================
   ADMIN LINK
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
   PROJECT CARD
========================================= */

function createProjectCard(
  id,
  data
) {

  const title =
    data.name ||
    data.title ||
    data.projectName ||
    "Untitled Website";


  const description =
    data.requirements ||
    data.description ||
    "No requirements provided.";


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
        href="project.html?id=${encodeURIComponent(id)}">

        Track Project →

      </a>

    </div>

  `;


  return card;

}


/* =========================================
   LOAD CLIENT PROJECTS
========================================= */

async function loadClientProjects(user) {

  console.log(
    "Loading projects for client:",
    user.uid
  );


  /*
   * IMPORTANT:
   *
   * We only query projects belonging
   * to the currently authenticated user.
   *
   * No orderBy()
   * No composite index required.
   */

  const projectsQuery =
    query(
      collection(
        db,
        "projects"
      ),
      where(
        "clientId",
        "==",
        user.uid
      )
    );


  const snapshot =
    await getDocs(
      projectsQuery
    );


  console.log(
    "Projects found:",
    snapshot.size
  );


  return snapshot;

}


/* =========================================
   LOAD ADMIN PROJECTS
========================================= */

async function loadAdminProjects() {

  console.log(
    "ADMIN: Loading all projects"
  );


  /*
   * No orderBy().
   */

  const snapshot =
    await getDocs(
      collection(
        db,
        "projects"
      )
    );


  console.log(
    "Admin projects found:",
    snapshot.size
  );


  return snapshot;

}


/* =========================================
   RENDER PROJECTS
========================================= */

function renderProjects(snapshot) {

  hide(loadingState);
  hide(errorState);
  hide(emptyState);


  if (projectList) {
    projectList.innerHTML = "";
  }


  const projects = [];


  snapshot.forEach(
    projectDoc => {

      const data = projectDoc.data();
      if (String(data.paymentStatus || "").toLowerCase() === "rejected" || String(data.status || "").toLowerCase() === "payment rejected") {
        return;
      }
      projects.push({
        id: projectDoc.id,
        data
      });

    }
  );


  /*
   * Sort locally.
   * This avoids Firestore index requirements.
   */

  projects.sort(
    (a, b) => {

      const aTime =
        a.data.createdAt?.toMillis?.() || 0;

      const bTime =
        b.data.createdAt?.toMillis?.() || 0;

      return bTime - aTime;

    }
  );


  if (projects.length === 0) {
    show(emptyState);
    return;
  }

  projects.forEach(
    project => {

      const card =
        createProjectCard(
          project.id,
          project.data
        );


      projectList?.appendChild(
        card
      );

    }
  );

}


/* =========================================
   ERROR DISPLAY
========================================= */

function showProjectError(
  error,
  user,
  role
) {

  console.error(
    "WEBCRAFT PROJECT ERROR:",
    error
  );


  hide(loadingState);
  hide(emptyState);
  show(errorState);


  let message =
    "Unable to load projects.";


  if (
    error?.code ===
    "permission-denied"
  ) {

    message =
      "Firebase denied access to the projects collection. Check your Firestore Rules.";

  }

  else if (
    error?.code ===
    "failed-precondition"
  ) {

    message =
      "Firestore requires an index or the request is not supported.";

  }

  else if (
    error?.code ===
    "unauthenticated"
  ) {

    message =
      "Your Firebase login session is invalid. Please log in again.";

  }

  else if (
    error?.message
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
        Firebase code:
        ${escapeHTML(
          error?.code || "unknown"
        )}
      </p>

      <p class="muted">
        UID:
        ${escapeHTML(
          user?.uid || "unknown"
        )}
      </p>

      <p class="muted">
        Role:
        ${escapeHTML(
          role || "unknown"
        )}
      </p>

      <button
        id="retryProjects"
        class="btn"
        type="button">

        Try Again

      </button>

    </div>

  `;


  document
    .getElementById(
      "retryProjects"
    )
    ?.addEventListener(
      "click",
      () => {

        initializeDashboard(
          user
        );

      }
    );

}


/* =========================================
   MAIN DASHBOARD
========================================= */

async function initializeDashboard(
  user
) {

  show(loadingState);

  hide(errorState);
  hide(emptyState);


  try {

    displayUser(user);


    /*
     * First check the user's Firestore role.
     */

    const role =
      await getUserRole(
        user
      );


    console.log(
      "Dashboard role:",
      role
    );


    if (role === "admin") {

      addAdminLink();


      const snapshot =
        await loadAdminProjects();


      renderProjects(
        snapshot
      );


      return;

    }


    /*
     * Normal client
     */

    const snapshot =
      await loadClientProjects(
        user
      );


    renderProjects(
      snapshot
    );

  } catch (error) {

    /*
     * Get role safely for the error screen.
     */

    let role = "client";

    try {

      role =
        await getUserRole(
          user
        );

    } catch {}

    showProjectError(
      error,
      user,
      role
    );

  }

}


/* =========================================
   AUTH STATE
========================================= */

onAuthStateChanged(
  auth,
  async user => {

    if (!user) {

      window.location.href =
        "../login.html";

      return;

    }


    console.log(
      "================================"
    );

    console.log(
      "WEBCRAFT DASHBOARD"
    );

    console.log(
      "Authenticated:",
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
     * Keep verification requirement.
     */

    try {

      await user.reload();

    } catch (error) {

      console.error(
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


    await initializeDashboard(
      user
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
          "Logout error:",
          error
        );

      }

    }
  );

}
