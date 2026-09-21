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
const structureBox = document.querySelector("#structure");

let currentUser = null;


/* =========================
   AUTH
========================= */

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

  if (form.name && !form.name.value) {
    form.name.value = user.displayName || "";
  }

});


/* =========================
   PACKAGE
========================= */

document
  .querySelectorAll('input[name="package"]')
  .forEach(input => {

    input.addEventListener("change", () => {

      const price = Number(
        input.dataset.price || 0
      );

      selectedPrice.textContent =
        `${input.value} — ₱${price.toLocaleString("en-PH")}`;

    });

  });


/* =========================
   IMAGE SELECTION
========================= */

designsInput.addEventListener("change", () => {

  const files = [...designsInput.files];

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


/* =========================
   STRUCTURE BUILDER
========================= */

let structureCounter = 0;


function createId() {

  structureCounter++;

  return `structure-${Date.now()}-${structureCounter}`;

}


function createItem(type, parentChildren = structureBox) {

  const item = document.createElement("div");

  item.className = "tree-item";

  item.dataset.type = type;
  item.dataset.id = createId();

  const row = document.createElement("div");

  row.className = "tree-row";


  const icon = document.createElement("span");

  icon.textContent =
    type === "folder"
      ? "📁"
      : "📄";


  const name = document.createElement("input");

  name.type = "text";

  name.className = "structure-name";

  name.placeholder =
    type === "folder"
      ? "Folder name"
      : "File name";

  name.required = true;


  const addFile = document.createElement("button");

  addFile.type = "button";

  addFile.className = "mini-btn";

  addFile.textContent = "+ File";


  const addFolder = document.createElement("button");

  addFolder.type = "button";

  addFolder.className = "mini-btn";

  addFolder.textContent = "+ Folder";


  const remove = document.createElement("button");

  remove.type = "button";

  remove.className =
    "mini-btn remove-btn";

  remove.textContent = "Remove";


  row.appendChild(icon);
  row.appendChild(name);


  if (type === "folder") {

    row.appendChild(addFile);
    row.appendChild(addFolder);

  }


  row.appendChild(remove);

  item.appendChild(row);


  const description = document.createElement("textarea");

  description.className = "description";

  description.placeholder =
    type === "folder"
      ? "Describe what this folder contains or its purpose..."
      : "Describe exactly what you want this file to do...";


  item.appendChild(description);


  if (type === "folder") {

    const children = document.createElement("div");

    children.className =
      "tree-children";

    item.appendChild(children);


    addFile.addEventListener("click", () => {

      createItem(
        "file",
        children
      );

    });


    addFolder.addEventListener("click", () => {

      createItem(
        "folder",
        children
      );

    });

  }


  remove.addEventListener("click", () => {

    item.remove();

  });


  parentChildren.appendChild(item);

  return item;

}


document
  .querySelector("#addRootFolder")
  .addEventListener("click", () => {

    createItem(
      "folder",
      structureBox
    );

  });


document
  .querySelector("#addRootFile")
  .addEventListener("click", () => {

    createItem(
      "file",
      structureBox
    );

  });


/* =========================
   STRUCTURE READER
========================= */

function collectStructure(container, parentPath = "") {

  const result = [];

  const items =
    [...container.children]
      .filter(
        el =>
          el.classList.contains("tree-item")
      );


  for (const item of items) {

    const type =
      item.dataset.type;

    const name =
      item.querySelector(
        ".structure-name"
      )?.value.trim();


    const description =
      item.querySelector(
        ".description"
      )?.value.trim() || "";


    if (!name) {

      throw new Error(
        "Every folder and file needs a name."
      );

    }


    const path =
      parentPath
        ? `${parentPath}/${name}`
        : name;


    const entry = {

      type,
      name,
      path,
      description

    };


    if (type === "folder") {

      const children =
        item.querySelector(
          ":scope > .tree-children"
        );


      entry.children =
        collectStructure(
          children,
          path
        );

    }


    result.push(entry);

  }


  return result;

}


/* =========================
   FLATTEN STRUCTURE
========================= */

function flattenStructure(
  structure,
  output = []
) {

  for (const item of structure) {

    output.push({

      type: item.type,

      name: item.name,

      path: item.path,

      description:
        item.description || ""

    });


    if (
      item.type === "folder" &&
      Array.isArray(item.children)
    ) {

      flattenStructure(
        item.children,
        output
      );

    }

  }


  return output;

}


/* =========================
   COMPRESS IMAGE
========================= */

function compressImage(file) {

  return new Promise(
    (resolve, reject) => {

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
            document.createElement(
              "canvas"
            );


          canvas.width = width;
          canvas.height = height;


          const ctx =
            canvas.getContext(
              "2d"
            );


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


          if (
            dataUrl.length > 900000
          ) {

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

    }
  );

}


/* =========================
   EMAIL ATTACHMENT
========================= */

function dataUrlToAttachment(
  design
) {

  const parts =
    design.content.split(",");


  return {

    filename:
      design.name ||
      "client-design.jpg",

    content:
      parts[1],

    contentType:
      design.type ||
      "image/jpeg"

  };

}


/* =========================
   SUBMIT
========================= */

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


    let structure;


    try {

      structure =
        collectStructure(
          structureBox
        );

    } catch (error) {

      showMessage(
        error.message,
        true
      );

      return;

    }


    if (!structure.length) {

      showMessage(
        "Please create at least one folder or file.",
        true
      );

      return;

    }


    const flatStructure =
      flattenStructure(
        structure
      );


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


    submitButton.disabled = true;


    try {

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

            clientName,

            clientEmail:
              currentUser.email,

            requirements,

            package:
              packageName,

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

            structure,

            flatStructure,

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp()

          }
        );


      const emailAttachments = [];


      for (
        let i = 0;
        i < files.length;
        i++
      ) {

        const file =
          files[i];


        if (
          !file.type.startsWith(
            "image/"
          )
        ) {

          throw new Error(
            `${file.name} is not a valid image.`
          );

        }


        if (
          file.size >
          10 * 1024 * 1024
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
          await compressImage(
            file
          );


        emailAttachments.push(
          dataUrlToAttachment(
            compressed
          )
        );


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

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({

                projectId:
                  projectRef.id,

                clientName,

                clientEmail:
                  currentUser.email,

                projectName,

                package:
                  packageName,

                price,

                requirements,

                structure,

                flatStructure,

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


      showMessage(
        "Project submitted successfully! Redirecting to payment...",
        false
      );


      setTimeout(() => {

        location.href =
          `payment.html?id=${encodeURIComponent(
            projectRef.id
          )}`;

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


/* =========================
   MESSAGE
========================= */

function showMessage(
  text,
  isError = false
) {

  if (!msg) return;

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
