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
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const form = document.querySelector("#requestForm");
const msg = document.querySelector("#message");
const designsInput = document.querySelector("#designs");
const selectedImages = document.querySelector("#selectedImages");
const selectedPrice = document.querySelector("#selectedPrice");

let currentUser = null;


// ==================================================
// AUTH
// ==================================================

onAuthStateChanged(auth, async user => {

  if (!user) {
    location.href = "../login.html";
    return;
  }

  try {
    await user.reload();
  } catch {}

  if (!user.emailVerified) {
    location.href = "../login.html";
    return;
  }

  currentUser = user;

  if (form.email) {
    form.email.value = user.email || "";
    form.email.readOnly = true;
  }

  if (
    form.name &&
    !form.name.value
  ) {
    form.name.value =
      user.displayName || "";
  }

});


// ==================================================
// PACKAGE PRICE
// ==================================================

document
  .querySelectorAll('input[name="package"]')
  .forEach(input => {

    input.addEventListener("change", () => {

      const price =
        Number(input.dataset.price || 0);

      selectedPrice.classList.remove("hidden");

      selectedPrice.textContent =
        `${input.value} — ₱${price.toLocaleString("en-PH")}`;

    });

  });


// ==================================================
// DESIGN FILE SELECTION
// ==================================================

designsInput.addEventListener("change", () => {

  const files =
    [...designsInput.files];

  if (files.length > 5) {

    designsInput.value = "";

    selectedImages.textContent =
      "Maximum of 5 images only.";

    return;
  }

  selectedImages.textContent =
    files.length
      ? `${files.length} image(s) selected.`
      : "";

});


// ==================================================
// COMPRESS IMAGE
// ==================================================

function compressImage(file) {

  return new Promise((resolve, reject) => {

    const reader =
      new FileReader();

    reader.onload = event => {

      const image =
        new Image();

      image.onload = () => {

        const MAX_WIDTH = 1200;

        let width =
          image.width;

        let height =
          image.height;


        if (width > MAX_WIDTH) {

          height =
            Math.round(
              height *
              (MAX_WIDTH / width)
            );

          width =
            MAX_WIDTH;

        }


        const canvas =
          document.createElement("canvas");

        canvas.width =
          width;

        canvas.height =
          height;


        const ctx =
          canvas.getContext("2d");

        ctx.drawImage(
          image,
          0,
          0,
          width,
          height
        );


        let quality = 0.65;

        let dataUrl =
          canvas.toDataURL(
            "image/jpeg",
            quality
          );


        while (
          dataUrl.length > 700000 &&
          quality > 0.25
        ) {

          quality -= 0.10;

          dataUrl =
            canvas.toDataURL(
              "image/jpeg",
              quality
            );

        }


        if (dataUrl.length > 900000) {

          reject(
            new Error(
              `${file.name} is too large even after compression.`
            )
          );

          return;
        }


        resolve({

          name:
            file.name,

          type:
            "image/jpeg",

          size:
            dataUrl.length,

          content:
            dataUrl

        });

      };


      image.onerror = () => {

        reject(
          new Error(
            `Unable to read image: ${file.name}`
          )
        );

      };


      image.src =
        event.target.result;

    };


    reader.onerror = () => {

      reject(
        new Error(
          `Unable to load image: ${file.name}`
        )
      );

    };


    reader.readAsDataURL(file);

  });

}


// ==================================================
// CONVERT DATA URL TO RESEND ATTACHMENT
// ==================================================

function dataUrlToAttachment(
  design
) {

  const parts =
    design.content.split(",");

  return {

    filename:
      design.name || "client-design.jpg",

    content:
      parts[1],

    contentType:
      design.type || "image/jpeg"

  };

}


// ==================================================
// SUBMIT PROJECT
// ==================================================

form.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    if (!currentUser) {

      showMessage(
        "Please wait for your account to finish loading.",
        true
      );

      return;
    }


    const packageInput =
      form.querySelector(
        'input[name="package"]:checked'
      );


    if (!packageInput) {

      showMessage(
        "Please choose a package.",
        true
      );

      return;
    }


    const files =
      [...designsInput.files];


    if (!files.length) {

      showMessage(
        "Please upload at least one design image.",
        true
      );

      return;
    }


    if (files.length > 5) {

      showMessage(
        "Maximum of 5 design images.",
        true
      );

      return;
    }


    const projectName =
      String(
        form.website.value || ""
      ).trim();


    const clientName =
      String(
        form.name.value || ""
      ).trim();


    const requirements =
      String(
        form.requirements.value || ""
      ).trim();


    const packageName =
      packageInput.value;


    const price =
      Number(
        packageInput.dataset.price || 0
      );


    if (!projectName) {

      showMessage(
        "Please enter a project name.",
        true
      );

      return;
    }


    if (!clientName) {

      showMessage(
        "Please enter your name.",
        true
      );

      return;
    }


    const submitButton =
      form.querySelector(
        'button[type="submit"]'
      );


    const originalText =
      submitButton.textContent;


    submitButton.disabled =
      true;


    try {

      // --------------------------------------------
      // CREATE PROJECT
      // --------------------------------------------

      showMessage(
        "Creating project...",
        false
      );


      const projectRef =
        await addDoc(
          collection(
            db,
            "projects"
          ),
          {

            clientId:
              currentUser.uid,

            name:
              projectName,

            clientName:
              clientName,

            clientEmail:
              currentUser.email,

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


      // --------------------------------------------
      // PROCESS DESIGNS
      // --------------------------------------------

      const designs = [];
      const emailAttachments = [];


      for (
        let i = 0;
        i < files.length;
        i++
      ) {

        const file =
          files[i];


        if (
          !file.type.startsWith("image/")
        ) {

          throw new Error(
            `${file.name} is not a valid image.`
          );

        }


        if (
          file.size > 10 * 1024 * 1024
        ) {

          throw new Error(
            `${file.name} is larger than 10MB.`
          );

        }


        showMessage(
          `Processing design ${i + 1} of ${files.length}...`,
          false
        );


        const compressed =
          await compressImage(file);


        designs.push(
          compressed
        );


        emailAttachments.push(
          dataUrlToAttachment(
            compressed
          )
        );


        // ------------------------------------------
        // SAVE DESIGN TO FIRESTORE
        // ------------------------------------------

        await setDoc(
          doc(
            db,
            "projects",
            projectRef.id,
            "designs",
            String(i + 1)
          ),
          {

            name:
              compressed.name,

            type:
              compressed.type,

            size:
              compressed.size,

            content:
              compressed.content,

            createdAt:
              serverTimestamp()

          }
        );

      }


      // --------------------------------------------
      // SEND PROJECT EMAIL
      // --------------------------------------------

      showMessage(
        "Sending project notification...",
        false
      );


      const emailResponse =
        await fetch(
          "/api/send-project",
          {
            method:
              "POST",

            headers:
              {
                "Content-Type":
                  "application/json"
              },

            body:
              JSON.stringify({

                projectId:
                  projectRef.id,

                clientName:
                  clientName,

                clientEmail:
                  currentUser.email,

                projectName:
                  projectName,

                package:
                  packageName,

                price:
                  price,

                requirements:
                  requirements,

                attachments:
                  emailAttachments

              })

          }
        );


      let emailData = {};

      try {

        emailData =
          await emailResponse.json();

      } catch {

        emailData = {};

      }


      if (!emailResponse.ok) {

        console.error(
          "PROJECT EMAIL ERROR:",
          emailData
        );

        throw new Error(
          emailData?.error?.message ||
          emailData?.error ||
          "Project was created, but the admin email could not be sent."
        );

      }


      // --------------------------------------------
      // SUCCESS
      // --------------------------------------------

      showMessage(
        "Project submitted successfully! Redirecting to payment...",
        false
      );


      setTimeout(() => {

        location.href =
          `payment.html?id=${encodeURIComponent(projectRef.id)}`;

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


      submitButton.disabled =
        false;

      submitButton.textContent =
        originalText;

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

  if (!msg) {
    return;
  }

  msg.classList.remove(
    "hidden"
  );

  msg.classList.toggle(
    "error",
    isError
  );

  msg.textContent =
    text;

}
