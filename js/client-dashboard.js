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
   HELPERS
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

    const date =
      typeof value.toDate === "function"
        ? value.toDate()
        : new Date(value);

    if (isNaN(date.getTime())) {
      return "No date";
    }

    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });

  } catch {

    return "No date";

  }

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


/* =========================================
   USER INFO
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
   ADMIN LINK
========================================= */

function addAdminLink() {

  const nav =
    document.querySelector("header nav");

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
   GET ROLE
========================================= */

async function getUserRole(user) {

  try {

    const userRef =
      doc(
        db,
        "users",
        user.uid
      );

    const userSnap =
      await getDoc(userRef);

    if (!userSnap.exists()) {

      console.warn(
        "users/" + user.uid +
        " does not exist."
      );

      return "client";

    }

    const data =
      userSnap.data();

    console.log(
      "WebCraft user role:",
      data.role
    );

    return data.role || "client";

  } catch (error) {

    console.error(
      "ROLE ERROR:",
      error
    );

    return "client";

  }

}


/* =========================================
   LOAD PROJECTS
========================================= */

async function loadProjects(user, role) {

  show(loadingState);

  hide(errorState);

  hide(emptyState);


  if (projectList) {
    projectList.innerHTML = "";
  }


  try {

    let projectsQuery;


    /*
     * ADMIN
     *
     * Admin can load ALL projects.
     */

    if (role === "admin") {

      console.log(
        "ADMIN MODE: Loading ALL projects"
      );

      projectsQuery =
        query(
          collection(
            db,
            "projects"
          )
        );

    }

    /*
     * CLIENT
     *
     * Client only loads projects
     * belonging to their UID.
     */

    else {

      console.log(
        "CLIENT MODE: Loading projects for UID:",
        user.uid
      );

      projectsQuery =
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

    }


    const snapshot =
      await getDocs(
        projectsQuery
      );


    console.log(
      "Firestore project count:",
      snapshot.size
    );


    hide(loadingState);


    if (snapshot.empty) {

      show(emptyState);

      return;

    }


    const projects = [];


    snapshot.forEach(
      (projectDoc) => {

        projects.push({
          id: projectDoc.id,
          data: projectDoc.data()
        });

      }
    );


    /*
     * NEWEST FIRST
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


    /*
     * RENDER
     */

    projects.forEach(
      (project) => {

        const data =
          project.data;

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
              class="status-badge ${statusClass(status)}">

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
                project.id
              )}">

              Track Project →

            </a>

          </div>

        `;


        projectList.appendChild(
          card
        );

      }
    );


  } catch (error) {

    console.error(
      "WEBCRAFT FIRESTORE ERROR:",
      error
    );


    hide(loadingState);

    hide(emptyState);

    show(errorState);


    let message =
      "Unknown Firebase error.";


    if (
      error.code ===
      "permission-denied"
    ) {

      message =
        "Permission denied. Your Firestore Rules rejected the request.";

    }

    else if (
      error.code ===
      "failed-precondition"
    ) {

      message =
        "Firestore failed the request. Check your Firebase configuration/index.";

    }

    else if (
      error.code ===
      "unauthenticated"
    ) {

      message =
        "You are not authenticated with Firebase.";

    }

    else if (
      error.code ===
      "unavailable"
    ) {

      message =
        "Firebase is temporarily unavailable.";

    }

    else if (error.message) {

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
          ${escapeHTML(error.code || "unknown")}
        </p>

        <button
          class="btn"
          id="retryProjects"
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

          loadProjects(
            user,
            role
          );

        }
      );

  }

}


/* =========================================
   AUTH
========================================= */

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      window.location.href =
        "../login.html";

      return;

    }


    console.log(
      "================================"
    );

    console.log(
      "WEBCRAFT AUTHENTICATED"
    );

    console.log(
      "UID:",
      user.uid
    );

    console.log(
      "EMAIL:",
      user.email
    );


    displayUser(user);


    /*
     * Get role from Firestore.
     */

    const role =
      await getUserRole(user);


    console.log(
      "ROLE:",
      role
    );


    /*
     * Admin gets Admin Dashboard link.
     */

    if (role === "admin") {

      addAdminLink();

    }


    /*
     * Load projects.
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

        await signOut(auth);

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
