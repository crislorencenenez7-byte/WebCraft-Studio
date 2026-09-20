import { firebaseConfig } from "./firebase-config.js";

import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

const box =
  document.getElementById("requests");


let currentUser = null;


/* =========================
   AUTH + ADMIN CHECK
========================= */

onAuthStateChanged(
  auth,
  async user => {

    if (!user) {

      location.href =
        "../login.html";

      return;
    }


    currentUser = user;


    try {

      await user.reload();

    } catch {}


    if (!user.emailVerified) {

      location.href =
        "../login.html";

      return;
    }


    try {

      const userRef =
        doc(
          db,
          "users",
          user.uid
        );


      const userSnapshot =
        await getDoc(userRef);


      if (
        !userSnapshot.exists() ||
        userSnapshot.data().role !== "admin"
      ) {

        alert(
          "Admin access required."
        );

        location.href =
          "../client/dashboard.html";

        return;
      }


      await loadProjects();

    } catch (error) {

      console.error(error);

      box.innerHTML = `
        <div class="panel notice error">
          ${escapeHTML(error.message)}
        </div>
      `;

    }

  }
);


/* =========================
   LOAD PROJECTS
========================= */

async function loadProjects() {

  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          "projects"
        )
      );


    if (snapshot.empty) {

      box.innerHTML = `
        <div class="panel">

          <h2>
            No Projects Yet
          </h2>

          <p class="muted">
            Client projects will appear here.
          </p>

        </div>
      `;

      return;
    }


    const projects =
      snapshot.docs.map(
        item => ({
          id: item.id,
          data: item.data()
        })
      );


    projects.sort(
      (a, b) => {

        const aTime =
          a.data.createdAt?.toMillis?.() || 0;

        const bTime =
          b.data.createdAt?.toMillis?.() || 0;

        return bTime - aTime;

      }
    );


    box.innerHTML = "";


    for (const project of projects) {

      const card =
        await createProjectCard(
          project.id,
          project.data
        );

      box.appendChild(card);

    }

  } catch (error) {

    console.error(
      "ADMIN LOAD ERROR:",
      error
    );

    box.innerHTML = `
      <div class="panel notice error">

        <strong>
          Unable to load projects
        </strong>

        <p>
          ${escapeHTML(error.message)}
        </p>

      </div>
    `;

  }

}


/* =========================
   PROJECT CARD
========================= */

async function createProjectCard(
  id,
  project
) {

  const article =
    document.createElement(
      "article"
    );


  article.className =
    "panel admin-project";


  const status =
    project.status ||
    "Payment Required";


  const paymentStatus =
    String(
      project.paymentStatus ||
      "pending"
    ).toLowerCase();


  let paymentClass =
    "pending";

  let paymentText =
    "⏳ Pending";


  if (
    paymentStatus ===
    "submitted"
  ) {

    paymentClass =
      "pending";

    paymentText =
      "⏳ Pending Verification";

  }


  if (
    paymentStatus ===
    "verified"
  ) {

    paymentClass =
      "verified";

    paymentText =
      "✓ Verified";

  }


  if (
    paymentStatus ===
    "rejected"
  ) {

    paymentClass =
      "rejected";

    paymentText =
      "✕ Rejected";

  }


  article.innerHTML = `

    <span class="pill">
      ${escapeHTML(status)}
    </span>

    <h2>
      ${escapeHTML(
        project.name ||
        "Untitled Website"
      )}
    </h2>

    <p>
      <strong>Client:</strong>
      ${escapeHTML(
        project.clientName ||
        "Unknown"
      )}
    </p>

    <p>
      <strong>Email:</strong>
      ${escapeHTML(
        project.clientEmail ||
        ""
      )}
    </p>

    <p>
      <strong>Package:</strong>
      ${escapeHTML(
        project.package ||
        "Not specified"
      )}
    </p>

    <p>
      <strong>Amount Due:</strong>
      ₱${Number(
        project.price || 0
      ).toLocaleString("en-PH")}
    </p>

    <p>
      <strong>Requirements:</strong><br>
      ${escapeHTML(
        project.requirements ||
        "None"
      )}
    </p>

    <div class="payment-section">

      <h3>
        Payment Verification
      </h3>

      <p>
        <strong>Status:</strong>
        <span class="${paymentClass}">
          ${paymentText}
        </span>
      </p>

      <p>
        <strong>Reference:</strong>
        ${escapeHTML(
          project.paymentReference ||
          "Not submitted"
        )}
      </p>

      <div
        class="proof-container">
      </div>

      <div
        class="admin-actions">
      </div>

    </div>

    <div class="admin-actions">

      <a
        class="btn"
        href="editor.html?id=${encodeURIComponent(id)}">

        Open Editor →

      </a>

    </div>

  `;


  const proofContainer =
    article.querySelector(
      ".proof-container"
    );


  const actions =
    article.querySelector(
      ".admin-actions"
    );


  /* =========================
     SHOW PAYMENT SCREENSHOT
  ========================= */

  if (
    project.paymentProof
  ) {

    const proof =
      document.createElement(
        "div"
      );


    proof.className =
      "payment-proof";


    proof.innerHTML = `

      <p>
        <strong>
          Payment Screenshot
        </strong>
      </p>

      <img
        src="${escapeHTML(
          project.paymentProof
        )}"
        alt="Client payment screenshot">

    `;


    proofContainer.appendChild(
      proof
    );

  }


  /* =========================
     VERIFY / REJECT
  ========================= */

  if (
    paymentStatus ===
    "submitted"
  ) {

    const verifyButton =
      document.createElement(
        "button"
      );


    verifyButton.className =
      "btn";


    verifyButton.textContent =
      "✓ Verify Payment";


    verifyButton.type =
      "button";


    verifyButton.addEventListener(
      "click",
      async () => {

        const confirmed =
          confirm(
            "Confirm that you checked the screenshot and the payment amount?"
          );


        if (!confirmed) {
          return;
        }


        verifyButton.disabled =
          true;


        try {

          await updateDoc(
            doc(
              db,
              "projects",
              id
            ),
            {

              paymentStatus:
                "verified",

              paymentVerifiedAt:
                serverTimestamp(),

              status:
                "Coding",

              updatedAt:
                serverTimestamp()

            }
          );


          await loadProjects();

        } catch (error) {

          alert(
            error.message
          );

          verifyButton.disabled =
            false;

        }

      }
    );


    const rejectButton =
      document.createElement(
        "button"
      );


    rejectButton.className =
      "btn btn-danger";


    rejectButton.textContent =
      "✕ Reject Payment";


    rejectButton.type =
      "button";


    rejectButton.addEventListener(
      "click",
      async () => {

        const confirmed =
          confirm(
            "Reject this payment submission?"
          );


        if (!confirmed) {
          return;
        }


        rejectButton.disabled =
          true;


        try {

          await updateDoc(
            doc(
              db,
              "projects",
              id
            ),
            {

              paymentStatus:
                "rejected",

              paymentRejectedAt:
                serverTimestamp(),

              status:
                "Payment Required",

              updatedAt:
                serverTimestamp()

            }
          );


          await loadProjects();

        } catch (error) {

          alert(
            error.message
          );

          rejectButton.disabled =
            false;

        }

      }
    );


    actions.appendChild(
      verifyButton
    );

    actions.appendChild(
      rejectButton
    );

  }


  return article;

}


/* =========================
   ESCAPE HTML
========================= */

function escapeHTML(value) {

  return String(value ?? "")
    .replace(
      /[&<>'"]/g,
      character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      })[character]
    );

}
