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
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const app =
  getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);


const auth =
  getAuth(app);

const db =
  getFirestore(app);


const projectId =
  new URLSearchParams(
    location.search
  ).get("id");


const code =
  document.querySelector("#code");

const fileName =
  document.querySelector("#fileName");

const message =
  document.querySelector("#editorMessage");


const projectTitle =
  document.querySelector("#projectTitle");

const projectDetails =
  document.querySelector("#projectDetails");

const requirements =
  document.querySelector("#requirements");


const designsContainer =
  document.querySelector("#designs");


const gcashReference =
  document.querySelector("#gcashReference");

const paymentStatus =
  document.querySelector("#paymentStatus");

const paymentProof =
  document.querySelector("#paymentProof");

const paymentActions =
  document.querySelector("#paymentActions");

const acceptPayment =
  document.querySelector("#acceptPayment");

const rejectPayment =
  document.querySelector("#rejectPayment");


let currentFile =
  "index.html";

let currentProject =
  null;


// ==================================================
// ADMIN GUARD
// ==================================================

async function checkAdmin() {

  const user =
    auth.currentUser;


  if (!user) {

    location.href =
      "../login.html";

    return false;

  }


  const userDoc =
    await getDoc(
      doc(
        db,
        "users",
        user.uid
      )
    );


  if (
    !userDoc.exists() ||
    userDoc.data().role !== "admin"
  ) {

    alert(
      "Admin access required."
    );

    location.href =
      "../client/dashboard.html";

    return false;

  }


  return true;

}


// ==================================================
// LOAD PROJECT
// ==================================================

async function loadProject() {

  if (!projectId) {

    showMessage(
      "Project ID is missing.",
      true
    );

    return;

  }


  try {

    const projectRef =
      doc(
        db,
        "projects",
        projectId
      );


    const snapshot =
      await getDoc(
        projectRef
      );


    if (!snapshot.exists()) {

      showMessage(
        "Project not found.",
        true
      );

      return;

    }


    currentProject =
      snapshot.data();


    renderProject();

    await loadDesigns();

    await loadCode(
      currentFile
    );

  } catch (error) {

    console.error(error);

    showMessage(
      error.message ||
      "Unable to load project.",
      true
    );

  }

}


// ==================================================
// RENDER PROJECT
// ==================================================

function renderProject() {

  const project =
    currentProject;


  projectTitle.textContent =
    project.name ||
    "Untitled Project";


  projectDetails.innerHTML = `

    <div class="info-card">

      <small>
        Client
      </small>

      <strong>
        ${esc(
          project.clientName ||
          "Unknown"
        )}
      </strong>

    </div>


    <div class="info-card">

      <small>
        Email
      </small>

      <strong>
        ${esc(
          project.clientEmail ||
          ""
        )}
      </strong>

    </div>


    <div class="info-card">

      <small>
        Package
      </small>

      <strong>
        ${esc(
          project.package ||
          ""
        )}
      </strong>

    </div>


    <div class="info-card">

      <small>
        Price
      </small>

      <strong>
        ₱${Number(
          project.price || 0
        ).toLocaleString("en-PH")}
      </strong>

    </div>


    <div class="info-card">

      <small>
        Project Status
      </small>

      <strong>
        ${esc(
          project.status ||
          "Pending"
        )}
      </strong>

    </div>

  `;


  requirements.textContent =
    project.requirements ||
    "No requirements provided.";


  // ----------------------------------------------
  // PAYMENT
  // ----------------------------------------------

  const reference =
    project.paymentReference ||
    "";


  gcashReference.textContent =
    reference ||
    "No reference submitted.";


  const status =
    String(
      project.paymentStatus ||
      "pending"
    ).toLowerCase();


  paymentStatus.className =
    "payment-status";


  if (status === "verified") {

    paymentStatus.textContent =
      "✓ Verified";

    paymentStatus.classList.add(
      "status-verified"
    );

    paymentActions.style.display =
      "none";

  } else if (
    status === "submitted"
  ) {

    paymentStatus.textContent =
      "⏳ Pending Verification";

    paymentStatus.classList.add(
      "status-pending"
    );

    paymentActions.style.display =
      "flex";

  } else if (
    status === "rejected"
  ) {

    paymentStatus.textContent =
      "✕ Rejected";

    paymentStatus.classList.add(
      "status-rejected"
    );

    paymentActions.style.display =
      "none";

  } else {

    paymentStatus.textContent =
      "Payment Required";

    paymentStatus.classList.add(
      "status-pending"
    );

    paymentActions.style.display =
      "none";

  }


  // ----------------------------------------------
  // PAYMENT PROOF
  // ----------------------------------------------

  paymentProof.innerHTML = "";


  const proof =
    project.paymentProof;


  if (
    proof &&
    typeof proof === "object" &&
    proof.content
  ) {

    const image =
      document.createElement("img");

    image.src =
      proof.content;

    image.alt =
      "GCash Proof of Payment";


    const download =
      document.createElement("a");

    download.href =
      proof.content;

    download.download =
      proof.name ||
      "gcash-payment-proof.jpg";

    download.textContent =
      "Download payment proof";


    paymentProof.appendChild(
      image
    );

    paymentProof.appendChild(
      download
    );

  } else if (
    typeof proof === "string" &&
    proof.startsWith("data:image/")
  ) {

    const image =
      document.createElement("img");

    image.src =
      proof;

    image.alt =
      "GCash Proof of Payment";


    paymentProof.appendChild(
      image
    );

  } else {

    paymentProof.innerHTML = `

      <p class="muted">
        No payment proof submitted yet.
      </p>

    `;

  }

}


// ==================================================
// LOAD CLIENT DESIGNS
// ==================================================

async function loadDesigns() {

  designsContainer.innerHTML = `

    <p class="muted">
      Loading designs...
    </p>

  `;


  try {

    const designsSnap =
      await getDocs(
        collection(
          db,
          "projects",
          projectId,
          "designs"
        )
      );


    if (designsSnap.empty) {

      designsContainer.innerHTML = `

        <p class="muted">
          No client design uploaded.
        </p>

      `;

      return;

    }


    const designs =
      designsSnap.docs
        .map(document => ({
          id:
            document.id,

          ...document.data()

        }))
        .sort(
          (a, b) =>
            Number(a.id) -
            Number(b.id)
        );


    designsContainer.innerHTML = "";


    designs.forEach(
      (design, index) => {

        if (!design.content) {
          return;
        }


        const card =
          document.createElement("div");

        card.className =
          "design-card";


        const image =
          document.createElement("img");

        image.src =
          design.content;

        image.alt =
          design.name ||
          `Client Design ${index + 1}`;

        image.loading =
          "lazy";


        const title =
          document.createElement("p");

        title.textContent =
          design.name ||
          `Client Design ${index + 1}`;


        const download =
          document.createElement("a");

        download.href =
          design.content;

        download.download =
          design.name ||
          `client-design-${index + 1}.jpg`;

        download.textContent =
          "Download image";


        card.appendChild(
          image
        );

        card.appendChild(
          title
        );

        card.appendChild(
          download
        );


        designsContainer.appendChild(
          card
        );

      }
    );

  } catch (error) {

    console.error(error);

    designsContainer.innerHTML = `

      <p class="notice error">
        ${esc(error.message)}
      </p>

    `;

  }

}


// ==================================================
// LOAD CODE
// ==================================================

async function loadCode(
  filename
) {

  currentFile =
    filename;


  fileName.value =
    filename;


  code.value =
    "";


  try {

    const snapshot =
      await getDoc(
        doc(
          db,
          "projects",
          projectId,
          "files",
          filename
        )
      );


    if (
      snapshot.exists()
    ) {

      code.value =
        snapshot.data().content ||
        "";

    }

  } catch (error) {

    showMessage(
      error.message,
      true
    );

  }

}


// ==================================================
// SAVE CODE
// ==================================================

async function saveCode() {

  if (!projectId) {
    return;
  }


  try {

    await setDoc(
      doc(
        db,
        "projects",
        projectId,
        "files",
        currentFile
      ),
      {

        name:
          currentFile,

        content:
          code.value,

        updatedAt:
          serverTimestamp()

      },
      {
        merge:
          true
      }
    );


    await updateDoc(
      doc(
        db,
        "projects",
        projectId
      ),
      {

        status:
          "Coding",

        updatedAt:
          serverTimestamp()

      }
    );


    currentProject.status =
      "Coding";


    showMessage(
      `${currentFile} saved.`,
      false
    );

  } catch (error) {

    console.error(error);

    showMessage(
      error.message ||
      "Unable to save code.",
      true
    );

  }

}


// ==================================================
// ACCEPT PAYMENT
// ==================================================

acceptPayment.addEventListener(
  "click",
  async () => {

    if (
      !confirm(
        "Accept this GCash payment and start coding?"
      )
    ) {

      return;

    }


    try {

      await updateDoc(
        doc(
          db,
          "projects",
          projectId
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


      currentProject.paymentStatus =
        "verified";

      currentProject.status =
        "Coding";


      renderProject();


      showMessage(
        "Payment accepted. Project is now Coding.",
        false
      );

    } catch (error) {

      console.error(error);

      showMessage(
        error.message ||
        "Unable to accept payment.",
        true
      );

    }

  }
);


// ==================================================
// REJECT PAYMENT
// ==================================================

rejectPayment.addEventListener(
  "click",
  async () => {

    if (
      !confirm(
        "Reject this GCash payment proof?"
      )
    ) {

      return;

    }


    try {

      await updateDoc(
        doc(
          db,
          "projects",
          projectId
        ),
        {

          paymentStatus:
            "rejected",

          paymentRejectedAt:
            serverTimestamp(),

          status:
            "Payment Rejected",

          updatedAt:
            serverTimestamp()

        }
      );


      currentProject.paymentStatus =
        "rejected";

      currentProject.status =
        "Payment Rejected";


      renderProject();


      showMessage(
        "Payment rejected.",
        false
      );

    } catch (error) {

      console.error(error);

      showMessage(
        error.message ||
        "Unable to reject payment.",
        true
      );

    }

  }
);


// ==================================================
// FILE BUTTONS
// ==================================================

document
  .querySelectorAll(".file")
  .forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        if (
          currentFile !==
          button.dataset.file
        ) {

          await saveCode();

        }


        document
          .querySelectorAll(".file")
          .forEach(
            item =>
              item.classList.remove(
                "active"
              )
          );


        button.classList.add(
          "active"
        );


        await loadCode(
          button.dataset.file
        );

      }
    );

  });


// ==================================================
// SAVE BUTTON
// ==================================================

document
  .querySelector("#saveCode")
  .addEventListener(
    "click",
    saveCode
  );


// ==================================================
// PREVIEW
// ==================================================

document
  .querySelector("#preview")
  .addEventListener(
    "click",
    () => {

      const previewWindow =
        window.open(
          "",
          "_blank"
        );


      if (!previewWindow) {

        alert(
          "Please allow pop-ups to preview the code."
        );

        return;

      }


      previewWindow.document.open();

      previewWindow.document.write(
        code.value
      );

      previewWindow.document.close();

    }
  );


// ==================================================
// MARK COMPLETED
// ==================================================

document
  .querySelector("#deliver")
  .addEventListener(
    "click",
    async () => {

      if (
        !confirm(
          "Mark this project as completed?"
        )
      ) {

        return;

      }


      try {

        await updateDoc(
          doc(
            db,
            "projects",
            projectId
          ),
          {

            status:
              "Completed",

            updatedAt:
              serverTimestamp()

          }
        );


        currentProject.status =
          "Completed";


        renderProject();


        showMessage(
          "Project marked as completed.",
          false
        );

      } catch (error) {

        console.error(error);

        showMessage(
          error.message ||
          "Unable to mark project completed.",
          true
        );

      }

    }
  );


// ==================================================
// MESSAGE
// ==================================================

function showMessage(
  text,
  isError = false
) {

  message.classList.remove(
    "hidden"
  );

  message.classList.toggle(
    "error",
    isError
  );

  message.textContent =
    text;

}


// ==================================================
// ESCAPE HTML
// ==================================================

function esc(value) {

  return String(
    value ?? ""
  ).replace(
    /[&<>'"]/g,
    character => ({

      "&":
        "&amp;",

      "<":
        "&lt;",

      ">":
        "&gt;",

      "'":
        "&#39;",

      '"':
        "&quot;"

    }[character])
  );

}


// ==================================================
// START
// ==================================================

onAuthStateChanged(
  auth,
  async user => {

    if (!user) {

      location.href =
        "../login.html";

      return;

    }


    try {

      const allowed =
        await checkAdmin();


      if (!allowed) {
        return;
      }


      await loadProject();

    } catch (error) {

      console.error(error);

      showMessage(
        error.message ||
        "Unable to initialize editor.",
        true
      );

    }

  }
);
