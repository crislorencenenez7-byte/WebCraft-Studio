// Firebase V2 configuration placeholder.
// Create a Firebase Web App, then paste its config values below.
// Do NOT put a Firebase Admin SDK/service-account private key in this file.
export const firebaseConfig = {
  apiKey: "AIzaSyDBIL6FaYMeoCn-Yd_2GT2KyERtx_ZYW7k",
  authDomain: "webcraft-c5254.firebaseapp.com",
  projectId: "webcraft-c5254",
  storageBucket: "webcraft-c5254.firebasestorage.app",
  messagingSenderId: "303800254551",
  appId: "1:303800254551:web:7b104f1a12734234182312",
  measurementId: "G-KQ7N6VSR0M"
};
export const firebaseReady = () =>
  !Object.values(firebaseConfig).some(v => String(v).includes("PASTE_") || String(v).includes("YOUR_"));
