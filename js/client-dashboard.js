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

function hide(element) {
  if (!element) return;

  element.classList.add("hidden");
  element.style.display = "none";
}


function show(element) {
  if (!element) return;

  element.classList.remove("hidden");
  element.style.display = "";
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


function statusClass(status) {

  const value =
    String(status || "Pending")
      .toLowerCase();

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

  const nav = document.querySelector("header nav");

  if (!nav) return;

  if (document.getElementById("adminDashboardLink")) {
    return;
  }

  const link =
    document.createElement("a");

  link.id = "adminDashboardLink";
  link.href = "../admin/dashboard.html";
  link.textContent = "Admin";

  nav.insertBefore(
    link,
    logoutButton || null
  );
}


/* =========================================
   CHECK USER ROLE
========================================= */

async function checkUserRole(user) {

  try {

    const userRef =
      doc(db, "users", user.uid);

    const userSnap =
      await getDoc(userRef);

    if (!userSnap.exists()) {
      console.warn(
        "No Firestore user document found."
      );
      return;
    }

    const data =
      userSnap.data();

    console.log(
      "WebCraft role:",
      data.role
    );

    if (data.role === "admin") {
      addAdminLink();
    }

  } catch (error) {

    console.error(
      "Role check failed:",
      error
    );
  }
}


/* =========================================
   LOAD PROJECTS
========================================= */

async function loadProjects(user) {

  show(loadingState);

  hide(errorState);
  hide(emptyState);

  if (projectList) {
    projectList.innerHTML = "";
  }

  try {

    console.log(
      "Loading projects for:",
      user.uid
    );

    /*
      IMPORTANT:

      Firestore project document:

      clientId = Firebase Authentication UID
    */

    const projectsRef =
      collection(db, "projects");

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
      await getDocs(projectsQuery);

    console.log(
      "Projects found:",
      snapshot.size
    );

    hide(loadingState);

    if (snapshot.empty) {

      show(emptyState);

      return;
    }

    const projects = [];

    snapshot.forEach((projectDoc) => {

      projects.push({
        id: projectDoc.id,
        data: projectDoc.data()
      });

    });


    /* Sort locally */
    projects.sort((a, b) => {

      const aDate =
        a.data.createdAt?.toMillis?.() || 0;

      const bDate =
        b.data.createdAt?.toMillis?.() || 0;

      return bDate - aDate;
    });


    /* Render */
    projects.forEach((project) => {

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

          <span class="status-badge ${statusClass(status)}">
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
            href="project.html?id=${encodeURIComponent(project.id)}">
            Track Project →
          </a>

        </div>
      `;

      projectList.appendChild(card);
    });

  } catch (error) {

    console.error(
      "PROJECT LOAD ERROR:",
      error
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
        "Firestore denied access. Make sure clientId is the same as your Firebase Auth UID.";
    }

    else if (
      error.code ===
      "failed-precondition"
    ) {

      message =
        "Firestore configuration/index problem.";
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
        () => loadProjects(user)
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
      "Logged in:",
      user.email
    );

    console.log(
      "UID:",
      user.uid
    );

    displayUser(user);

    await checkUserRole(user);

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
          "Logout error:",
          error
        );

        alert(
          "Unable to log out."
        );
      }
    }
  );
}
        <b>02</b>

        <h3>
          Track your project
        </h3>

        <p>
          See the current status and review the work from your portal.
        </p>

        <a
          class="text-link"
          href="#projects">
          View projects →
        </a>

      </article>


      <article>

        <b>03</b>

        <h3>
          Get the website
        </h3>

        <p>
          When development is complete, your finished files and preview are delivered here.
        </p>

      </article>

    </section>


    <!-- =========================
         TRACK YOUR PROJECT
         ========================= -->

    <section
      class="panel"
      id="projects">

      <div class="section-header">

        <div>
          <span class="section-label">
            PROJECTS
          </span>

          <h2>
            Track Your Project
          </h2>

          <p class="muted">
            Monitor the progress of your website requests.
          </p>
        </div>

        <a
          href="request.html"
          class="btn">
          + New project
        </a>

      </div>


      <!-- LOADING -->

      <div id="loadingState">

        <p class="muted">
          Loading projects...
        </p>

      </div>


      <!-- ERROR -->

      <div
        id="errorState"
        class="hidden">
      </div>


      <!-- EMPTY -->

      <div
        id="emptyState"
        class="hidden">

        <h3>
          No projects yet
        </h3>

        <p class="muted">
          Your website requests will appear here.
        </p>

        <a
          href="request.html"
          class="btn">
          Request a Website
        </a>

      </div>


      <!-- PROJECT CARDS -->

      <div id="projectList"></div>

    </section>


    <!-- =========================
         ACCOUNT
         ========================= -->

    <section class="panel">

      <div class="section-header">

        <div>

          <span class="section-label">
            ACCOUNT
          </span>

          <h2>
            Your Account
          </h2>

        </div>

      </div>

      <p
        class="muted"
        id="clientEmail">
        Loading...
      </p>

    </section>

  </main>


  <!-- =========================
       FOOTER
       ========================= -->

  <footer>

    <p>
      © 2026 WebCraft Studio
      <span>
        Design to code, made simple.
      </span>
    </p>

  </footer>


  <!-- =========================
       CLIENT DASHBOARD JS
       ========================= -->

  <script
    type="module"
    src="../js/client-dashboard.js">
  </script>

</body>

</html>
