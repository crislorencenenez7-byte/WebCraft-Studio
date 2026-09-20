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

const clientName = document.getElementById("clientName");
const clientEmail = document.getElementById("clientEmail");

const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const emptyState = document.getElementById("emptyState");
const projectList = document.getElementById("projectList");

const logoutButton = document.getElementById("logout");


/* =========================================
   HELPERS
========================================= */

function show(el) {
  if (!el) return;

  el.classList.remove("hidden");
  el.style.display = "";
}


function hide(el) {
  if (!el) return;

  el.classList.add("hidden");
  el.style.display = "none";
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
   CHECK ROLE
========================================= */

async function checkRole(user) {

  try {

    const userRef =
      doc(db, "users", user.uid);

    const snap =
      await getDoc(userRef);

    if (!snap.exists()) {

      console.warn(
        "users/" + user.uid +
        " does not exist."
      );

      return;

    }

    const data =
      snap.data();

    console.log(
      "USER DOCUMENT:",
      data
    );

    console.log(
      "USER ROLE:",
      data.role
    );

    if (data.role === "admin") {

      addAdminLink();

    }

  } catch (error) {

    console.error(
      "ROLE CHECK ERROR:",
      error
    );

  }

}


/* =========================================
   LOAD PROJECTS
========================================= */

async function loadProjects(user) {

  hide(errorState);
  hide(emptyState);

  show(loadingState);

  if (projectList) {
    projectList.innerHTML = "";
  }


  console.log(
    "=============================="
  );

  console.log(
    "WEBCRAFT PROJECT LOAD"
  );

  console.log(
    "Firebase UID:",
    user.uid
  );

  console.log(
    "Email:",
    user.email
  );


  try {

    const projectsRef =
      collection(
        db,
        "projects"
      );


    /*
      IMPORTANT:

      This query does NOT use orderBy().
      Therefore no composite index is required.
    */

    const q =
      query(
        projectsRef,
        where(
          "clientId",
          "==",
          user.uid
        )
      );


    console.log(
      "Running Firestore query..."
    );


    const snapshot =
      await getDocs(q);


    console.log(
      "Firestore SUCCESS"
    );

    console.log(
      "Projects:",
      snapshot.size
    );


    hide(loadingState);


    if (snapshot.empty) {

      show(emptyState);

      console.log(
        "No projects found for this UID."
      );

      return;

    }


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
          id: projectDoc.id,
          data
        });

      }
    );


    /* Sort newest first */

    projects.sort(
      (a, b) => {

        const aTime =
          a.data.createdAt?.toMillis?.() || 0;

        const bTime =
          b.data.createdAt?.toMillis?.() || 0;

        return bTime - aTime;

      }
    );


    /* Render */

    for (const project of projects) {

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
        document.createElement("article");

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


      projectList.appendChild(card);

    }


  } catch (error) {

    console.error(
      "================================"
    );

    console.error(
      "FIRESTORE PROJECT ERROR"
    );

    console.error(
      "CODE:",
      error.code
    );

    console.error(
      "MESSAGE:",
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
      "Unknown Firestore error.";


    if (
      error.code ===
      "permission-denied"
    ) {

      message =
        "PERMISSION DENIED: Firestore Rules rejected this query.";

    }

    else if (
      error.code ===
      "failed-precondition"
    ) {

      message =
        "FAILED PRECONDITION: Firestore requires an index or configuration is invalid.";

    }

    else if (
      error.code ===
      "unavailable"
    ) {

      message =
        "Firebase is temporarily unavailable.";

    }

    else if (
      error.code ===
      "unauthenticated"
    ) {

      message =
        "Firebase Authentication says you are not signed in.";

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
          Error code:
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
      .getElementById("retryProjects")
      ?.addEventListener(
        "click",
        () => {

          if (auth.currentUser) {
            loadProjects(auth.currentUser);
          }

        }
      );

  }

}


/* =========================================
   AUTH STATE
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
      "AUTHENTICATED USER:",
      user.uid
    );


    displayUser(user);


    await checkRole(user);


    await loadProjects(user);

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
          "LOGOUT ERROR:",
          error
        );

      }

    }
  );

}
