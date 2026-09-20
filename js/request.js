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
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

const form = document.getElementById("requestForm");
const message = document.getElementById("message");
const selectedPackage = document.getElementById("selectedPackage");

let currentUser = null;


/* =========================
   PACKAGE SELECTION
========================= */

const packageInputs =
  document.querySelectorAll('input[name="package"]');

const packageCards =
  document.querySelectorAll(".package-card");


packageInputs.forEach(input => {

  input.addEventListener("change", () => {

    packageCards.forEach(card => {
      card.classList.remove("selected");
    });

    const selectedCard =
      input.closest(".package-card");

    selectedCard?.classList.add("selected");

    const price =
      Number(input.dataset.price);

    selectedPackage.style.display = "block";

    selectedPackage.innerHTML = `
      <strong>${escapeHTML(input.value)}</strong>
      <br>
      Amount: <strong>₱${price.toLocaleString("en-PH")}</strong>
    `;

  });

});


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
  } catch (error) {
    console.error(error);
  }

  if (!user.emailVerified) {
    location.href = "../login.html";
    return;
  }

  form.email.value = user.email || "";
  form.email.readOnly = true;

  if (!form.name.value) {
    form.name.value =
      user.displayName ||
      user.email?.split("@")[0] ||
      "";
  }

});


/* =========================
   SUBMIT PROJECT
========================= */

form.addEventListener("submit", async event => {

  event.preventDefault();

  if (!currentUser) {
    showMessage("Please log in first.", true);
    return;
  }

  const selected =
    document.querySelector(
      'input[name="package"]:checked'
    );

  if (!selected) {
    showMessage(
      "Please choose a website package.",
      true
    );
    return;
  }

  const files =
    [...form.elements.designs.files];

  if (!files.length) {
    showMessage(
      "Please upload at least one design image.",
      true
    );
    return;
  }


  const packageName =
    selected.value;

  const price =
    Number(selected.dataset.price);


  const projectName =
    form.elements.website.value.trim();

  const requirements =
    form.elements.requirements.value.trim();

  const clientName =
    form.elements.name.value.trim();


  const submitButton =
    form.querySelector("button[type='submit']");

  submitButton.disabled = true;
  submitButton.textContent =
    "Creating Project...";


  try {

    const projectRef =
      await addDoc(
        collection(db, "projects"),
        {

          clientId: currentUser.uid,

          name: projectName,

          clientName: clientName,

          clientEmail: currentUser.email,

          requirements: requirements,

          package: packageName,

          price: price,

          paymentMethod: "GCash",

          paymentStatus: "pending",

          paymentReference: "",

          paymentProof: "",

          paymentSubmittedAt: null,

          paymentVerifiedAt: null,

          paymentRejectedAt: null,

          status: "Payment Required",

          designs: files.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size
          })),

          createdAt: serverTimestamp(),

          updatedAt: serverTimestamp()

        }
      );


    /* =========================
       SAVE DESIGN METADATA
       ========================= */

    message.classList.remove("hidden");

    message.classList.remove("error");

    message.textContent =
      "Project created. Redirecting to payment...";


    setTimeout(() => {

      location.href =
        `payment.html?id=${encodeURIComponent(projectRef.id)}`;

    }, 500);


  } catch (error) {

    console.error(
      "PROJECT CREATE ERROR:",
      error
    );

    showMessage(
      error.message ||
      "Unable to create project.",
      true
    );

    submitButton.disabled = false;

    submitButton.textContent =
      "Continue to Payment →";

  }

});


/* =========================
   HELPERS
========================= */

function showMessage(text, error = false) {

  message.classList.remove("hidden");

  message.textContent = text;

  message.classList.toggle(
    "error",
    error
  );

}


function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}
