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
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const box =
  document.querySelector('#requests');


// --------------------------------------------------
// AUTH + ADMIN CHECK
// --------------------------------------------------

onAuthStateChanged(auth, async user => {

  if (!user) {

    location.href = '../login.html';

    return;

  }


  try {

    const userDoc =
      await getDocs(
        query(
          collection(db, 'users')
        )
      );


    const mine =
      userDoc.docs.find(
        d => d.id === user.uid
      );


    if (
      !mine ||
      mine.data().role !== 'admin'
    ) {

      alert('Admin access required.');

      location.href =
        '../client/dashboard.html';

      return;

    }


    load();

  } catch (error) {

    box.innerHTML =
      `<div class="notice error">
        ${esc(error.message)}
      </div>`;

  }

});


// --------------------------------------------------
// LOAD PROJECTS
// --------------------------------------------------

async function load() {

  try {

    const snap =
      await getDocs(
        query(
          collection(db, 'projects'),
          orderBy(
            'createdAt',
            'desc'
          )
        )
      );


    if (snap.empty) {

      box.innerHTML =
        `<div class="panel">
          <p class="muted">
            No project requests yet.
          </p>
        </div>`;

      return;

    }


    box.innerHTML = '';


    for (const projectDoc of snap.docs) {

      const project =
        projectDoc.data();

      const article =
        document.createElement('article');

      article.className =
        'panel';


      article.innerHTML = `

        <span class="pill">
          ${esc(project.status || 'Pending')}
        </span>

        <h2>
          ${esc(project.name || 'Untitled')}
        </h2>

        <p>
          <strong>Client:</strong>
          ${esc(project.clientName || '')}
        </p>

        <p>
          <strong>Email:</strong>
          ${esc(project.clientEmail || '')}
        </p>

        <p>
          <strong>Package:</strong>
          ${esc(project.package || '')}
        </p>

        <p>
          <strong>Amount:</strong>
          ₱${Number(project.price || 0).toLocaleString()}
        </p>

        <p>
          <strong>Payment:</strong>
          ${esc(project.paymentStatus || 'pending')}
        </p>

        <p>
          <strong>Reference:</strong>
          ${esc(project.paymentReference || 'None')}
        </p>

        <p>
          ${esc(project.requirements || '')}
        </p>

        <div class="design-area">
          <h3>Client Design</h3>

          <div class="design-list">
            Loading designs...
          </div>
        </div>

        <div class="admin-actions">

          <button
            class="btn verify-btn"
            data-id="${projectDoc.id}"
          >
            Verify Payment
          </button>

          <button
            class="btn reject-btn"
            data-id="${projectDoc.id}"
          >
            Reject Payment
          </button>

          <a
            class="btn"
            href="editor.html?id=${encodeURIComponent(projectDoc.id)}"
          >
            Open Editor →
          </a>

        </div>

      `;


      box.appendChild(article);


      const designList =
        article.querySelector(
          '.design-list'
        );


      await loadDesigns(
        projectDoc.id,
        designList
      );


      article
        .querySelector('.verify-btn')
        .addEventListener(
          'click',
          () =>
            verifyPayment(
              projectDoc.id
            )
        );


      article
        .querySelector('.reject-btn')
        .addEventListener(
          'click',
          () =>
            rejectPayment(
              projectDoc.id
            )
        );

    }

  } catch (error) {

    console.error(error);

    box.innerHTML =
      `<div class="notice error">
        ${esc(error.message)}
      </div>`;

  }

}


// --------------------------------------------------
// LOAD DESIGNS
// --------------------------------------------------

async function loadDesigns(
  projectId,
  container
) {

  try {

    const designsSnap =
      await getDocs(
        collection(
          db,
          'projects',
          projectId,
          'designs'
        )
      );


    if (designsSnap.empty) {

      container.innerHTML =
        `<p class="muted">
          No design images uploaded.
        </p>`;

      return;

    }


    const designs =
      designsSnap.docs
        .map(d => ({
          id: d.id,
          ...d.data()
        }))
        .sort(
          (a, b) =>
            Number(a.id) -
            Number(b.id)
        );


    container.innerHTML = '';


    designs.forEach(
      (design, index) => {

        if (!design.content) {

          return;

        }


        const wrapper =
          document.createElement('div');

        wrapper.className =
          'design-item';


        const image =
          document.createElement('img');

        image.src =
          design.content;

        image.alt =
          design.name ||
          `Client Design ${index + 1}`;

        image.loading = 'lazy';

        image.style.maxWidth =
          '100%';

        image.style.display =
          'block';


        const title =
          document.createElement('p');

        title.textContent =
          design.name ||
          `Design ${index + 1}`;


        const download =
          document.createElement('a');

        download.href =
          design.content;

        download.download =
          design.name ||
          `design-${index + 1}.jpg`;

        download.textContent =
          'Download image';


        wrapper.appendChild(title);

        wrapper.appendChild(image);

        wrapper.appendChild(download);

        container.appendChild(wrapper);

      }
    );

  } catch (error) {

    console.error(error);

    container.innerHTML =
      `<p class="notice error">
        ${esc(error.message)}
      </p>`;

  }

}


// --------------------------------------------------
// VERIFY PAYMENT
// --------------------------------------------------

async function verifyPayment(
  projectId
) {

  if (
    !confirm(
      'Verify this payment and start coding?'
    )
  ) {

    return;

  }


  try {

    await updateDoc(
      doc(
        db,
        'projects',
        projectId
      ),
      {

        paymentStatus:
          'verified',

        paymentVerifiedAt:
          serverTimestamp(),

        status:
          'Coding',

        updatedAt:
          serverTimestamp()

      }
    );


    alert(
      'Payment verified. Project is now Coding.'
    );


    load();

  } catch (error) {

    alert(error.message);

  }

}


// --------------------------------------------------
// REJECT PAYMENT
// --------------------------------------------------

async function rejectPayment(
  projectId
) {

  if (
    !confirm(
      'Reject this payment proof?'
    )
  ) {

    return;

  }


  try {

    await updateDoc(
      doc(
        db,
        'projects',
        projectId
      ),
      {

        paymentStatus:
          'rejected',

        paymentRejectedAt:
          serverTimestamp(),

        status:
          'Payment Required',

        updatedAt:
          serverTimestamp()

      }
    );


    alert(
      'Payment rejected.'
    );


    load();

  } catch (error) {

    alert(error.message);

  }

}


// --------------------------------------------------
// HTML ESCAPE
// --------------------------------------------------

function esc(value) {

  return String(value ?? '')
    .replace(
      /[&<>'"]/g,
      char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[char])
    );

}
