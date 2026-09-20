/* =========================================================
   WEBCRAFT STUDIO
   CLIENT DASHBOARD
   ========================================================= */

import { firebaseConfig } from "./firebase-config.js";


/* FIREBASE APP */

import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";


/* FIREBASE AUTH */

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


/* FIRESTORE */

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   INITIALIZE FIREBASE
   ========================================================= */

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


/* =========================================================
   HTML ELEMENTS
   ========================================================= */

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


/* =========================================================
   SHOW / HIDE
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


/* =========================================================
   SECURITY
   ========================================================= */

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =========================================================
   DATE
   ========================================================= */

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


/* =========================================================
   STATUS
   ========================================================= */

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
   DISPLAY USER
   ========================================================= */

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


/* =========================================================
   ADD ADMIN BUTTON
   ========================================================= */

function addAdminLink() {

  const nav =
    document.querySelector("header nav");


  if (!nav) {
    return;
  }


  if (
    document.getElementById(
      "adminDashboardLink"
    )
  ) {

    return;

  }


  const adminLink =
    document.createElement("a");


  adminLink.id =
    "adminDashboardLink";


  adminLink.href =
    "../admin/dashboard.html";


  adminLink.textContent =
    "Admin Dashboard";


  if (logoutButton) {

    nav.insertBefore(
      adminLink,
      logoutButton
    );

  } else {

    nav.appendChild(
      adminLink
    );

  }

}


/* =========================================================
   CHECK ADMIN ROLE
   ========================================================= */

async function checkUserRole(user) {

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
        "User document does not exist."
      );

      return;

    }


    const userData =
      userSnapshot.data();


    console.log(
      "Current role:",
      userData.role
    );


    if (
      userData.role === "admin"
    ) {

      addAdminLink();

      console.log(
        "Admin access detected."
      );

    }

  } catch (error) {

    console.error(
      "Role check failed:",
      error
    );

  }

}


/* =========================================================
   LOAD PROJECTS
   ========================================================= */

async function loadProjects(user) {

  if (!user) {
    return;
  }


  show(loadingState);

  hide(errorState);

  hide(emptyState);


  if (projectList) {

    projectList.innerHTML = "";

  }


  try {

    console.log(
      "Loading projects..."
    );

    console.log(
      "Client UID:",
      user.uid
    );


    /*
      IMPORTANT:

      Firestore:

      projects/{projectId}

      must contain:

      clientId:
      Firebase Authentication UID
    */


    const projectsRef =
      collection(
        db,
        "projects"
      );


    const projectsQuery =
      query(
        projectsRef,
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


    hide(loadingState);


    /* NO PROJECTS */

    if (snapshot.empty) {

      show(emptyState);

      return;

    }


    const projects = [];


    /* GET PROJECTS */

    snapshot.forEach(
      (projectDoc) => {

        projects.push({

          id:
            projectDoc.id,

          data:
            projectDoc.data()

        });

      }
    );


    /* SORT NEWEST FIRST */

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


    /* =====================================================
       RENDER PROJECTS
       ===================================================== */

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


        const createdAt =
          data.createdAt ||
          null;


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
                formatDate(createdAt)
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
      "PROJECT LOAD ERROR:",
      error
    );


    hide(loadingState);

    hide(emptyState);

    show(errorState);


    let message =
      "Unable to load projects.";


    if (
      error.code ===
      "permission-denied"
    ) {

      message =
        "Firestore denied access. Check that clientId matches your Firebase Auth UID.";

    }


    else if (
      error.code ===
      "failed-precondition"
    ) {

      message =
        "Firestore reported a configuration or index problem.";

    }


    else if (
      error.code ===
      "unavailable"
    ) {

      message =
        "Firebase is temporarily unavailable.";

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

        <button
          class="btn"
          id="retryProjects"
          type="button">

          Try Again

        </button>

      </div>

    `;


    const retryButton =
      document.getElementById(
        "retryProjects"
      );


    retryButton?.addEventListener(
      "click",
      () => {

        const currentUser =
          auth.currentUser;


        if (currentUser) {

          loadProjects(
            currentUser
          );

        }

      }
    );

  }

}


/* =========================================================
   AUTH STATE
   ========================================================= */

onAuthStateChanged(
  auth,
  async (user) => {

    console.log(
      "Auth state:",
      user
        ? "Logged in"
        : "Logged out"
    );


    if (!user) {

      window.location.href =
        "../login.html";

      return;

    }


    console.log(
      "Firebase UID:",
      user.uid
    );


    displayUser(
      user
    );


    await checkUserRole(
      user
    );


    await loadProjects(
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
