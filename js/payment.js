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
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


const projectName =
  document.getElementById("projectName");

const packageName =
  document.getElementById("packageName");

const amount =
  document.getElementById("amount");

const statusText =
  document.getElementById("statusText");

const paymentForm =
  document.getElementById("paymentForm");

const referenceInput =
  document.getElementById("reference");

const proofInput =
  document.getElementById("proof");

const submitButton =
  document.getElementById("submitPayment");

const message =
  document.getElementById("paymentMessage");


const params =
  new URLSearchParams(location.search);

const projectId =
  params.get("id");


let currentUser = null;
let projectData = null;


/* =========================
   AUTH
========================= */

onAuthStateChanged(auth, async user => {

  if (!user) {
    location.href = "../login.html";
    return;
  }

  currentUser = user;

  try {
    await user.reload();
  } catch {}

  if (!user.emailVerified) {
    location.href = "../login.html";
    return;
  }

  if (!projectId) {
    location.href =
      "dashboard.html#projects";
    return;
  }

  await loadProject();

});


/* =========================
   LOAD PROJECT
========================= */

async function loadProject() {

  try {

    const projectRef =
      doc(
        db,
        "projects",
        projectId
      );

    const snapshot =
      await getDoc(projectRef);


    if (!snapshot.exists()) {

      showMessage(
        "Project not found.",
        true
      );

      paymentForm.style.display =
        "none";

      return;
    }


    projectData =
      snapshot.data();


    /* SECURITY CHECK */

    if (
      projectData.clientId !==
      currentUser.uid
    ) {

      showMessage(
        "You do not have access to this project.",
        true
      );

      paymentForm.style.display =
        "none";

      return;
    }


    renderProject();

  } catch (error) {

    console.error(error);

    showMessage(
      error.message ||
      "Unable to load payment page.",
      true
    );

  }

}


/* =========================
   RENDER
========================= */

function renderProject() {

  projectName.textContent =
    projectData.name ||
    "Website Project";


  packageName.textContent =
    projectData.package ||
    "";


  const price =
    Number(projectData.price || 0);


  amount.textContent =
    `₱${price.toLocaleString("en-PH")}`;


  const paymentStatus =
    String(
      projectData.paymentStatus ||
      "pending"
    ).toLowerCase();


  if (
    paymentStatus === "verified"
  ) {

    statusText.textContent =
      "✓ Payment Verified";

    paymentForm.style.display =
      "none";

    return;
  }


  if (
    paymentStatus === "submitted"
  ) {

    statusText.textContent =
      "⏳ Pending Admin Verification";

    paymentForm.style.display =
      "none";

    return;
  }


  if (
    paymentStatus === "rejected"
  ) {

    statusText.textContent =
      "✕ Payment Rejected — Please Submit Again";

  } else {

    statusText.textContent =
      "Payment Required";

  }


  paymentForm.style.display =
    "block";

}


/* =========================
   SUBMIT PAYMENT
========================= */

paymentForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const reference =
      referenceInput.value.trim();

    const file =
      proofInput.files[0];


    if (!reference) {

      showMessage(
        "Please enter your GCash reference number.",
        true
      );

      return;
    }


    if (!file) {

      showMessage(
        "Please upload your payment screenshot.",
        true
      );

      return;
    }


    if (!file.type.startsWith("image/")) {

      showMessage(
        "Please upload an image file.",
        true
      );

      return;
    }


    submitButton.disabled =
      true;

    submitButton.textContent =
      "Processing Screenshot...";


    try {

      /*
       * Compress screenshot so it can fit
       * inside a Firestore document.
       */

      const proof =
        await compressImage(
          file,
          1200,
          0.70
        );


      /*
       * Firestore rules will prevent
       * the client from setting verified.
       */

      await updateDoc(
        doc(
          db,
          "projects",
          projectId
        ),
        {

          paymentReference:
            reference,

          paymentProof:
            proof,

          paymentStatus:
            "submitted",

          paymentSubmittedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()

        }
      );


      showMessage(
        "Payment proof submitted successfully. Please wait for admin verification.",
        false
      );


      statusText.textContent =
        "⏳ Pending Admin Verification";


      paymentForm.style.display =
        "none";


    } catch (error) {

      console.error(
        "PAYMENT SUBMIT ERROR:",
        error
      );


      showMessage(
        error.message ||
        "Unable to submit payment proof.",
        true
      );


      submitButton.disabled =
        false;

      submitButton.textContent =
        "Submit Payment Proof";

    }

  }
);


/* =========================
   IMAGE COMPRESSION
========================= */

function compressImage(
  file,
  maxWidth,
  quality
) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();


      reader.onload = event => {

        const img =
          new Image();


        img.onload = () => {

          let width =
            img.width;

          let height =
            img.height;


          if (width > maxWidth) {

            height =
              Math.round(
                height *
                (maxWidth / width)
              );

            width =
              maxWidth;

          }


          const canvas =
            document.createElement(
              "canvas"
            );


          canvas.width =
            width;

          canvas.height =
            height;


          const ctx =
            canvas.getContext(
              "2d"
            );


          ctx.drawImage(
            img,
            0,
            0,
            width,
            height
          );


          const result =
            canvas.toDataURL(
              "image/jpeg",
              quality
            );


          /*
           * Keep screenshot safely
           * below Firestore document limit.
           */

          if (
            result.length >
            900000
          ) {

            const smaller =
              canvas.toDataURL(
                "image/jpeg",
                0.50
              );

            resolve(smaller);

          } else {

            resolve(result);

          }

        };


        img.onerror =
          () => reject(
            new Error(
              "Unable to read screenshot."
            )
          );


        img.src =
          event.target.result;

      };


      reader.onerror =
        () => reject(
          new Error(
            "Unable to read uploaded file."
          )
        );


      reader.readAsDataURL(file);

    }
  );

}


/* =========================
   MESSAGE
========================= */

function showMessage(
  text,
  error
) {

  message.classList.remove(
    "hidden"
  );

  message.classList.toggle(
    "error",
    error
  );

  message.textContent =
    text;

}
