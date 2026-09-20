import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================
   WEBCRAFT STUDIO
   CLIENT DASHBOARD
   ========================================= */


const projectList =
  document.getElementById("projectList") ||
  document.getElementById("projectsList") ||
  document.getElementById("projects");

const emptyState =
  document.getElementById("emptyState");

const loadingState =
  document.getElementById("loadingState");

const errorState =
  document.getElementById("errorState");

const userName =
  document.getElementById("userName") ||
  document.getElementById("clientName");

const userEmail =
  document.getElementById("userEmail") ||
  document.getElementById("clientEmail");

const logoutButton =
  document.getElementById("logoutBtn") ||
  document.getElementById("logout");


/* =========================================
   HELPERS
   ========================================= */

function show(element) {
  if (element) {
    element.classList.remove("hidden");
    element.style.display = "";
  }
}

function hide(element) {
  if (element) {
    element.classList.add("hidden");
    element.style.display = "none";
  }
}


function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function formatDate(timestamp) {
  if (!timestamp) {
    return "No date";
  }

  try {
    let date;

    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) {
      return "No date";
    }

    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });

  } catch (error) {
    return "No date";
  }
}


function getStatusClass(status) {
  const value = String(status || "Pending").toLowerCase();

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
   LOADING / ERROR
   ========================================= */

function showLoading() {
  hide(emptyState);
  hide(errorState);
  show(loadingState);

  if (projectList) {
    projectList.innerHTML = "";
  }
}


function showEmpty() {
  hide(loadingState);
  hide(errorState);
  show(emptyState);

  if (projectList) {
    projectList.innerHTML = "";
  }
}


function showError(message) {
  hide(loadingState);
  hide(emptyState);
  show(errorState);

  if (errorState) {
    errorState.innerHTML = `
      <div class="error-box">
        <strong>Unable to load projects</strong>
        <p>${escapeHTML(message)}</p>
        <button
          type="button"
          class="btn"
          id="retryProjects"
        >
          Try Again
        </button>
      </div>
    `;

    const retryButton =
      document.getElementById("retryProjects");

    if (retryButton) {
      retryButton.addEventListener(
        "click",
        loadProjects
      );
    }
  }
}


/* =========================================
   USER INFORMATION
   ========================================= */

function displayUser(user) {
  if (userName) {
    userName.textContent =
      user.displayName ||
      user.email?.split("@")[0] ||
      "Client";
  }

  if (userEmail) {
    userEmail.textContent =
      user.email || "";
  }
}


/* =========================================
   RENDER PROJECTS
   ========================================= */

function renderProjects(projects) {

  hide(loadingState);
  hide(errorState);

  if (!projects.length) {
    showEmpty();
    return;
  }

  hide(emptyState);

  if (!projectList) {
    console.warn(
      "WebCraft Studio: projectList element was not found."
    );
    return;
  }

  projectList.innerHTML = "";

  projects.forEach((project) => {

    const id = project.id;
    const data = project.data;

    const title =
      data.title ||
      data.projectName ||
      data.name ||
      "Untitled Website";

    const description =
      data.description ||
      data.requirements ||
      "No project description.";

    const status =
      data.status ||
      "Pending";

    const createdAt =
      data.createdAt ||
      data.created_at ||
      null;

    const statusClass =
      getStatusClass(status);

    const card = document.createElement("article");

    card.className = "project-card";

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

        <span class="status-badge ${statusClass}">
          ${escapeHTML(status)}
        </span>

      </div>

      <div class="project-meta">

        <span>
          Created:
          ${escapeHTML(formatDate(createdAt))}
        </span>

        <span>
          Project ID:
          ${escapeHTML(id)}
        </span>

      </div>

      <div class="project-actions">

        <a
          class="btn"
          href="project.html?id=${encodeURIComponent(id)}"
        >
          Track Project →
        </a>

      </div>
    `;

    projectList.appendChild(card);
  });
}


/* =========================================
   LOAD CLIENT PROJECTS
   ========================================= */

async function loadProjects() {

  showLoading();

  const user = auth.currentUser;

  if (!user) {
    console.warn(
      "No authenticated Firebase user."
    );

    window.location.href = "../login.html";
    return;
  }

  try {

    console.log(
      "Loading projects for UID:",
      user.uid
    );

    /*
      IMPORTANT:

      Firestore query is restricted to the
      currently authenticated user's UID.

      Your Firestore document must look like:

      projects
        └── projectID
              ├── clientId: USER_UID
              ├── title: ...
              ├── status: ...
              └── createdAt: ...
    */

    const projectsRef =
      collection(db, "projects");

    const projectsQuery = query(
      projectsRef,
      where(
        "clientId",
        "==",
        user.uid
      )
    );

    const snapshot =
      await getDocs(projectsQuery);

    console.log(
      "Projects found:",
      snapshot.size
    );

    const projects = [];

    snapshot.forEach((docSnapshot) => {

      projects.push({
        id: docSnapshot.id,
        data: docSnapshot.data()
      });

    });

    /*
      Sort locally instead of using Firestore
      orderBy(). This avoids needing a composite
      Firestore index.
    */

    projects.sort((a, b) => {

      const dateA =
        a.data.createdAt?.toMillis?.() ||
        new Date(
          a.data.createdAt || 0
        ).getTime() ||
        0;

      const dateB =
        b.data.createdAt?.toMillis?.() ||
        new Date(
          b.data.createdAt || 0
        ).getTime() ||
        0;

      return dateB - dateA;
    });

    renderProjects(projects);

  } catch (error) {

    console.error(
      "Unable to load projects:",
      error
    );

    let message =
      "Something went wrong while loading your projects.";

    if (
      error.code ===
      "permission-denied"
    ) {
      message =
        "Firestore denied access. Make sure the project's clientId exactly matches your Firebase Auth UID.";
    }

    else if (
      error.code ===
      "failed-precondition"
    ) {
      message =
        "Firestore requires an index or has a configuration problem. This version avoids orderBy(), so check your Firestore setup.";
    }

    else if (
      error.code ===
      "unavailable"
    ) {
      message =
        "Firebase is temporarily unavailable. Check your internet connection and try again.";
    }

    else if (error.message) {
      message = error.message;
    }

    showError(message);
  }
}


/* =========================================
   AUTH STATE
   ========================================= */

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      console.log(
        "User is not logged in."
      );

      window.location.href =
        "../login.html";

      return;
    }

    console.log(
      "Authenticated user:",
      user.uid
    );

    displayUser(user);

    await loadProjects();
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

        await signOut(auth);

        window.location.href =
          "../login.html";

      } catch (error) {

        console.error(
          "Logout failed:",
          error
        );

        alert(
          "Unable to log out. Please try again."
        );
      }
    }
  );
}


/* =========================================
   GLOBAL RETRY
   ========================================= */

window.loadProjects =
  loadProjects;
