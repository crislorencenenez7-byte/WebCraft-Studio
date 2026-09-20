import { firebaseConfig } from './firebase-config.js';

import {
  initializeApp
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  reload
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';


// =====================================================
// FIREBASE INITIALIZATION
// =====================================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// =====================================================
// PAGE DETECTION
// =====================================================

const page = document.body.dataset.authPage;


// =====================================================
// MESSAGE SYSTEM
// =====================================================

const message = document.querySelector('#message');

function showMessage(text, error = false) {
  if (!message) return;

  message.classList.remove('hidden');
  message.classList.toggle('error', error);
  message.textContent = text;
}

function clearMessage() {
  if (!message) return;

  message.classList.add('hidden');
  message.classList.remove('error');
  message.textContent = '';
}


// =====================================================
// FIREBASE ERROR CLEANUP
// =====================================================

function cleanFirebaseError(error) {
  if (!error) {
    return 'Something went wrong. Please try again.';
  }

  let msg = error.message || String(error);

  msg = msg
    .replace(/^Firebase:\s*/i, '')
    .replace(/\s*\(auth\/[^)]+\)\.?$/i, '');

  const code = error.code || '';

  switch (code) {

    case 'auth/email-already-in-use':
      return 'This email is already registered. Please log in instead.';

    case 'auth/invalid-email':
      return 'Please enter a valid email address.';

    case 'auth/weak-password':
      return 'Password is too weak. Use a stronger password.';

    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';

    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a while and try again.';

    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection.';

    case 'auth/operation-not-allowed':
      return 'Email/Password authentication is not enabled in Firebase.';

    case 'auth/requires-recent-login':
      return 'Please log in again and try this action.';

    default:
      return msg;
  }
}


// =====================================================
// GUEST PAGE AUTH CHECK
// =====================================================

onAuthStateChanged(auth, async (user) => {

  if (page !== 'guest' || !user) {
    return;
  }

  try {

    await reload(user);

    if (user.emailVerified) {
      window.location.href = 'client/dashboard.html';
    }

  } catch (error) {
    console.error('Auth state error:', error);
  }

});


// =====================================================
// SIGN UP
// =====================================================

const signupForm = document.querySelector('#signupForm');

if (signupForm) {

  signupForm.addEventListener('submit', async (event) => {

    event.preventDefault();
    clearMessage();

    const fullname =
      signupForm.fullname?.value.trim() || '';

    const email =
      signupForm.email?.value.trim() || '';

    const password =
      signupForm.password?.value || '';

    const confirmPassword =
      signupForm.confirm?.value || '';


    // ---------------------------------------------
    // VALIDATION
    // ---------------------------------------------

    if (!fullname) {
      showMessage('Please enter your full name.', true);
      return;
    }

    if (!email) {
      showMessage('Please enter your email.', true);
      return;
    }

    if (!password) {
      showMessage('Please enter a password.', true);
      return;
    }

    if (password !== confirmPassword) {
      showMessage('Passwords do not match.', true);
      return;
    }


    // ---------------------------------------------
    // CREATE ACCOUNT
    // ---------------------------------------------

    try {

      showMessage('Creating your account...');

      const credential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = credential.user;


      // -------------------------------------------
      // PROFILE
      // -------------------------------------------

      await updateProfile(user, {
        displayName: fullname
      });


      // -------------------------------------------
      // FIRESTORE USER DOCUMENT
      // -------------------------------------------

      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          fullname: fullname,
          email: email,
          role: 'client',
          createdAt: serverTimestamp()
        }
      );


      // -------------------------------------------
      // SEND VERIFICATION EMAIL
      // -------------------------------------------

      try {

        await sendEmailVerification(user);

        console.log(
          'Verification email sent successfully.'
        );

        await signOut(auth);

        signupForm.reset();

        showMessage(
          'Account created successfully! ' +
          'Please check your email and click the verification link before logging in.'
        );

      } catch (emailError) {

        console.error(
          'Verification email error:',
          emailError
        );

        await signOut(auth);

        showMessage(
          'Your account was created, but Firebase could not send the verification email. ' +
          `Error: ${emailError.code || emailError.message}`,
          true
        );

      }

    } catch (error) {

      console.error(
        'Signup error:',
        error
      );

      showMessage(
        cleanFirebaseError(error),
        true
      );

    }

  });

}


// =====================================================
// LOGIN
// =====================================================

const loginForm = document.querySelector('#loginForm');

if (loginForm) {

  loginForm.addEventListener('submit', async (event) => {

    event.preventDefault();
    clearMessage();

    const email =
      loginForm.email?.value.trim() || '';

    const password =
      loginForm.password?.value || '';

    const remember =
      loginForm.remember?.checked ?? true;


    if (!email) {
      showMessage('Please enter your email.', true);
      return;
    }

    if (!password) {
      showMessage('Please enter your password.', true);
      return;
    }


    try {

      showMessage('Signing you in...');


      // -------------------------------------------
      // PERSISTENCE
      // -------------------------------------------

      await setPersistence(
        auth,
        remember
          ? browserLocalPersistence
          : browserSessionPersistence
      );


      // -------------------------------------------
      // LOGIN
      // -------------------------------------------

      const credential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = credential.user;


      // -------------------------------------------
      // REFRESH USER DATA
      // -------------------------------------------

      await reload(user);


      // -------------------------------------------
      // EMAIL VERIFICATION CHECK
      // -------------------------------------------

      if (!user.emailVerified) {

        // Sign out immediately
        await signOut(auth);

        showMessage(
          'Please verify your email before logging in. ' +
          'Check your inbox or spam folder.',
          true
        );

        return;
      }


      // -------------------------------------------
      // SUCCESS
      // -------------------------------------------

      window.location.href =
        'client/dashboard.html';

    } catch (error) {

      console.error(
        'Login error:',
        error
      );

      showMessage(
        cleanFirebaseError(error),
        true
      );

    }

  });

}


// =====================================================
// RESEND VERIFICATION EMAIL
// =====================================================

window.resendVerificationEmail = async function () {

  clearMessage();

  const emailInput =
    document.querySelector('#email');

  const passwordInput =
    document.querySelector('#password');


  const email =
    emailInput?.value.trim() || '';

  const password =
    passwordInput?.value || '';


  if (!email || !password) {

    showMessage(
      'Enter your email and password first, then resend the verification email.',
      true
    );

    return;
  }


  try {

    showMessage(
      'Checking your account...'
    );


    const credential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = credential.user;


    await reload(user);


    if (user.emailVerified) {

      await signOut(auth);

      showMessage(
        'Your email is already verified. You can log in now.'
      );

      return;
    }


    // -------------------------------------------
    // SEND AGAIN
    // -------------------------------------------

    await sendEmailVerification(user);


    await signOut(auth);


    showMessage(
      'Verification email sent again. Check your inbox and spam folder.'
    );

  } catch (error) {

    console.error(
      'Resend verification error:',
      error
    );

    try {
      await signOut(auth);
    } catch {}

    showMessage(
      cleanFirebaseError(error),
      true
    );

  }

};


// =====================================================
// PASSWORD RESET
// =====================================================

window.resetPassword = async function (email) {

  clearMessage();

  if (!email) {

    showMessage(
      'Enter your email address first.',
      true
    );

    return;
  }


  try {

    await sendPasswordResetEmail(
      auth,
      email
    );

    showMessage(
      'Password reset email sent. Check your inbox.'
    );

  } catch (error) {

    console.error(
      'Password reset error:',
      error
    );

    showMessage(
      cleanFirebaseError(error),
      true
    );

  }

};


// =====================================================
// FORGOT PASSWORD BUTTON
// =====================================================

const forgotButton =
  document.querySelector('#forgot');

if (forgotButton) {

  forgotButton.addEventListener(
    'click',
    () => {

      const emailInput =
        document.querySelector('#email');

      const email =
        emailInput?.value.trim() || '';

      window.resetPassword(email);

    }
  );

}