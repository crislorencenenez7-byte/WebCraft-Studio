import { firebaseConfig } from "./firebase-config.js";

import {
  initializeApp
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


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const form = document.querySelector("#requestForm");
const msg = document.querySelector("#message");

let currentUser = null;


// ===============================
// AUTH CHECK
// ===============================

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    location.href = "../login.html";
    return;
  }

  await user.reload();

  if (!user.emailVerified) {
    location.href = "../login.html";
    return;
  }

  currentUser = user;

  if (form.email) {
    form.email.value = user.email;
    form.email.readOnly = true;
  }

  if (form.name && !form.name.value) {
    form.name.value = user.displayName || "";
  }

});


// ===============================
// SUBMIT PROJECT
// ===============================

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  if (!currentUser) {
    showMessage("Please wait for your account to finish loading.", true);
    return;
  }

  const fd = new FormData(form);

  const clientName =
    String(fd.get("name") || "").trim();

  const clientEmail =
    currentUser.email;

  const projectName =
    String(
      fd.get("website") ||
      fd.get("projectName") ||
      ""
    ).trim();

  const requirements =
    String(fd.get("requirements") || "").trim();

  const packageName =
    String(fd.get("package") || "").trim();

  const price =
    Number(fd.get("price") || getPackagePrice(packageName));

  const designInput =
    form.querySelector('input[name="designs"]');

  const designFiles =
    designInput ? [...designInput.files] : [];


  // ===============================
  // VALIDATION
  // ===============================

  if (!clientName) {
    showMessage("Please enter your name.", true);
    return;
  }

  if (!projectName) {
    showMessage("Please enter a project name.", true);
    return;
  }

  if (!packageName) {
    showMessage("Please select a package.", true);
    return;
  }

  if (!price) {
    showMessage("Invalid package price.", true);
    return;
  }

  if (!designFiles.length) {
    showMessage("Please upload at least one design image.", true);
    return;
  }


  // ===============================
  // BUTTON STATE
  // ===============================

  const submitButton =
    form.querySelector('button[type="submit"]');

  const originalText =
    submitButton ? submitButton.textContent : "";

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";
  }


  try {

    // ===============================
    // CREATE FIRESTORE PROJECT
    // ===============================

    const projectRef = await addDoc(
      collection(db, "projects"),
      {

        clientId: currentUser.uid,

        clientName:
          clientName,

        clientEmail:
          clientEmail,

        name:
          projectName,

        websiteName:
          projectName,

        requirements:
          requirements,

        package:
          packageName,

        price:
          price,

        paymentMethod:
          "GCash",

        paymentStatus:
          "pending",

        paymentReference:
          "",

        paymentProof:
          "",

        paymentSubmittedAt:
          null,

        paymentVerifiedAt:
          null,

        paymentRejectedAt:
          null,

        status:
          "Payment Required",

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()

      }
    );


    // ===============================
    // PREPARE DESIGN IMAGES
    // ===============================

    const attachments = [];

    for (const file of designFiles) {

      // Prevent extremely large uploads
      if (file.size > 5 * 1024 * 1024) {
        throw new Error(
          `Image "${file.name}" is larger than 5MB.`
        );
      }

      const base64 =
        await fileToBase64(file);

      attachments.push({

        filename:
          file.name,

        content:
          base64.split(",")[1],

        contentType:
          file.type || "application/octet-stream"

      });

    }


    // ===============================
    // SEND EMAIL TO ADMIN
    // ===============================

    const emailResponse =
      await fetch("/api/send-project.js", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          projectId:
            projectRef.id,

          clientName:
            clientName,

          clientEmail:
            clientEmail,

          projectName:
            projectName,

          package:
            packageName,

          price:
            price,

          requirements:
            requirements,

          attachments:
            attachments

        })

      });


    const emailData =
      await emailResponse.json();


    if (!emailResponse.ok) {

      console.error(
        "Email API error:",
        emailData
      );

      throw new Error(
        emailData?.error?.message ||
        emailData?.error ||
        "Project was created, but the admin email could not be sent."
      );

    }


    // ===============================
    // SUCCESS
    // ===============================

    showMessage(
      "Project request submitted successfully! Redirecting to payment..."
    );


    setTimeout(() => {

      location.href =
        `../payment.html?id=${encodeURIComponent(projectRef.id)}`;

    }, 1000);


  } catch (error) {

    console.error(
      "PROJECT SUBMISSION ERROR:",
      error
    );

    showMessage(
      error.message ||
      "Something went wrong.",
      true
    );

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }

  }

});


// ===============================
// PACKAGE PRICE
// ===============================

function getPackagePrice(packageName) {

  const name =
    packageName.toLowerCase();

  if (
    name.includes("html") &&
    name.includes("javascript")
  ) {
    return 200;
  }

  if (
    name.includes("html") &&
    name.includes("css")
  ) {
    return 150;
  }

  if (
    name.includes("html")
  ) {
    return 100;
  }

  return 0;
}


// ===============================
// FILE → BASE64
// ===============================

function fileToBase64(file) {

  return new Promise((resolve, reject) => {

    const reader =
      new FileReader();

    reader.onload = () =>
      resolve(reader.result);

    reader.onerror = () =>
      reject(
        new Error(
          `Unable to read ${file.name}`
        )
      );

    reader.readAsDataURL(file);

  });

}


// ===============================
// MESSAGE
// ===============================

function showMessage(
  text,
  isError = false
) {

  if (!msg) return;

  msg.classList.remove("hidden");

  msg.classList.toggle(
    "error",
    isError
  );

  msg.textContent = text;

}
