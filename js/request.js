import { firebaseConfig } from './firebase-config.js';

import {
  initializeApp
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';

import {
  getAuth,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


const form = document.querySelector('#requestForm');

const msg = document.querySelector('#message');

const designsInput = document.querySelector('#designs');

const selectedImages = document.querySelector('#selectedImages');

const selectedPrice = document.querySelector('#selectedPrice');


let currentUser = null;


// --------------------------------------------------
// AUTH
// --------------------------------------------------

onAuthStateChanged(auth, async user => {

  if (!user) {
    location.href = '../login.html';
    return;
  }

  await user.reload();

  if (!user.emailVerified) {
    location.href = '../login.html';
    return;
  }

  currentUser = user;

  form.email.value = user.email;

  form.email.readOnly = true;

  if (!form.name.value) {
    form.name.value = user.displayName || '';
  }

});


// --------------------------------------------------
// PACKAGE PRICE DISPLAY
// --------------------------------------------------

document
  .querySelectorAll('input[name="package"]')
  .forEach(input => {

    input.addEventListener('change', () => {

      const price = Number(input.dataset.price);

      selectedPrice.classList.remove('hidden');

      selectedPrice.textContent =
        `${input.value} — ₱${price.toLocaleString()}`;

    });

  });


// --------------------------------------------------
// IMAGE SELECTION PREVIEW
// --------------------------------------------------

designsInput.addEventListener('change', () => {

  const files = [...designsInput.files];

  if (files.length > 5) {

    designsInput.value = '';

    selectedImages.textContent =
      'Maximum of 5 images only.';

    return;

  }

  selectedImages.textContent =
    files.length
      ? `${files.length} image(s) selected.`
      : '';

});


// --------------------------------------------------
// COMPRESS IMAGE
// --------------------------------------------------

function compressImage(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = event => {

      const image = new Image();

      image.onload = () => {

        const MAX_WIDTH = 1200;

        let width = image.width;

        let height = image.height;


        if (width > MAX_WIDTH) {

          height =
            Math.round(
              height * (MAX_WIDTH / width)
            );

          width = MAX_WIDTH;

        }


        const canvas = document.createElement('canvas');

        canvas.width = width;

        canvas.height = height;


        const ctx = canvas.getContext('2d');

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
            'image/jpeg',
            quality
          );


        /*
          Firestore documents have a size limit.

          Keep the image reasonably small.
        */

        while (
          dataUrl.length > 700000 &&
          quality > 0.25
        ) {

          quality -= 0.10;

          dataUrl =
            canvas.toDataURL(
              'image/jpeg',
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

          name: file.name,

          type: 'image/jpeg',

          size: dataUrl.length,

          content: dataUrl

        });

      };


      image.onerror = () => {

        reject(
          new Error(
            `Unable to read image: ${file.name}`
          )
        );

      };


      image.src = event.target.result;

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


// --------------------------------------------------
// SUBMIT PROJECT
// --------------------------------------------------

form.addEventListener('submit', async event => {

  event.preventDefault();


  if (!currentUser) {

    msg.className = 'notice error';

    msg.textContent =
      'Please log in first.';

    return;

  }


  const packageInput =
    form.querySelector(
      'input[name="package"]:checked'
    );


  if (!packageInput) {

    msg.className = 'notice error';

    msg.textContent =
      'Please choose a package.';

    return;

  }


  const files =
    [...designsInput.files];


  if (!files.length) {

    msg.className = 'notice error';

    msg.textContent =
      'Please upload at least one design image.';

    return;

  }


  if (files.length > 5) {

    msg.className = 'notice error';

    msg.textContent =
      'Maximum of 5 design images.';

    return;

  }


  const projectName =
    form.website.value.trim();

  const clientName =
    form.name.value.trim();

  const requirements =
    form.requirements.value.trim();

  const packageName =
    packageInput.value;

  const price =
    Number(packageInput.dataset.price);


  try {

    form.querySelector('button[type="submit"]').disabled = true;

    msg.className = 'notice';

    msg.textContent =
      'Uploading and compressing your design...';


    // ----------------------------------------------
    // CREATE PROJECT
    // ----------------------------------------------

    const projectRef = await addDoc(
      collection(db, 'projects'),
      {

        clientId: currentUser.uid,

        name: projectName,

        clientName: clientName,

        clientEmail: currentUser.email,

        requirements: requirements,

        package: packageName,

        price: price,

        paymentMethod: 'GCash',

        paymentStatus: 'pending',

        paymentReference: '',

        paymentProof: '',

        paymentSubmittedAt: null,

        paymentVerifiedAt: null,

        paymentRejectedAt: null,

        status: 'Payment Required',

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp()

      }
    );


    // ----------------------------------------------
    // COMPRESS + SAVE DESIGN IMAGES
    // ----------------------------------------------

    for (
      let i = 0;
      i < files.length;
      i++
    ) {

      const file = files[i];


      msg.textContent =
        `Processing design ${i + 1} of ${files.length}...`;


      const compressed =
        await compressImage(file);


      const designRef =
        doc(
          db,
          'projects',
          projectRef.id,
          'designs',
          String(i + 1)
        );


      await setDoc(
        designRef,
        {

          name: compressed.name,

          type: compressed.type,

          size: compressed.size,

          content: compressed.content,

          createdAt: serverTimestamp()

        }
      );

    }


    // ----------------------------------------------
    // SUCCESS
    // ----------------------------------------------

    location.href =
      `payment.html?id=${encodeURIComponent(projectRef.id)}`;

  } catch (error) {

    console.error(error);


    msg.className =
      'notice error';

    msg.textContent =
      error.message ||
      'Something went wrong.';


    form.querySelector(
      'button[type="submit"]'
    ).disabled = false;

  }

});
