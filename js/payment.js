import { firebaseConfig } from "./firebase-config.js";
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const projectName = document.getElementById("projectName");
const packageName = document.getElementById("packageName");
const amount = document.getElementById("amount");
const statusText = document.getElementById("statusText");
const paymentForm = document.getElementById("paymentForm");
const referenceInput = document.getElementById("reference");
const proofInput = document.getElementById("proof");
const submitButton = document.getElementById("submitPayment");
const message = document.getElementById("paymentMessage");
const projectId = new URLSearchParams(location.search).get("id");

let currentUser = null;
let projectData = null;

onAuthStateChanged(auth, async user => {
  if (!user) { location.href = "../login.html"; return; }
  currentUser = user;
  try { await user.reload(); } catch {}
  if (!user.emailVerified) { location.href = "../login.html"; return; }
  if (!projectId) { location.href = "dashboard.html#projects"; return; }
  await loadProject();
});

async function loadProject() {
  try {
    const snap = await getDoc(doc(db, "projects", projectId));
    if (!snap.exists()) { showMessage("Project not found.", true); paymentForm.style.display="none"; return; }
    projectData = snap.data();
    if (projectData.clientId !== currentUser.uid) { showMessage("You do not have access to this project.", true); paymentForm.style.display="none"; return; }
    renderProject();
  } catch (error) {
    console.error(error);
    showMessage(error.message || "Unable to load payment page.", true);
  }
}

function renderProject() {
  projectName.textContent = projectData.name || "Website Project";
  packageName.textContent = projectData.package || "";
  amount.textContent = `₱${Number(projectData.price || 0).toLocaleString("en-PH")}`;

  const status = String(projectData.paymentStatus || "pending").toLowerCase();

  if (status === "verified") {
    statusText.textContent = "✓ Payment Verified";
    paymentForm.style.display = "none";
    return;
  }
  if (status === "submitted") {
    statusText.textContent = "⏳ Pending Admin Verification";
    paymentForm.style.display = "none";
    return;
  }
  if (status === "rejected") {
    statusText.textContent = "✕ Payment Rejected — Submit a new proof";
  } else {
    statusText.textContent = "Payment Required";
  }
  paymentForm.style.display = "block";
  if (projectData.paymentReference) referenceInput.value = projectData.paymentReference;
}

paymentForm.addEventListener("submit", async event => {
  event.preventDefault();
  const reference = referenceInput.value.trim();
  const file = proofInput.files[0];

  if (!reference) return showMessage("Please enter your GCash reference number.", true);
  if (!file) return showMessage("Please upload your payment screenshot.", true);
  if (!file.type.startsWith("image/")) return showMessage("Please upload an image file.", true);

  submitButton.disabled = true;
  submitButton.textContent = "Processing Screenshot...";

  try {
    const proof = await compressImage(file);
    await updateDoc(doc(db, "projects", projectId), {
      paymentReference: reference,
      paymentProof: proof,
      paymentStatus: "submitted",
      paymentSubmittedAt: serverTimestamp(),
      paymentRejectedAt: null,
      updatedAt: serverTimestamp()
    });

    // Email notification is optional; the Firestore update remains successful even if the API is not configured.
    try {
      const response = await fetch("../api/send-payment.js", { method: "POST" });
      if (!response.ok) console.warn("Payment email endpoint not available/configured.");
    } catch (emailError) {
      console.warn("Payment email notification skipped:", emailError);
    }

    statusText.textContent = "⏳ Pending Admin Verification";
    paymentForm.style.display = "none";
    showMessage("Payment proof submitted. The admin will verify your payment before coding starts.", false);
  } catch (error) {
    console.error("PAYMENT SUBMIT ERROR:", error);
    showMessage(error.message || "Unable to submit payment proof.", true);
    submitButton.disabled = false;
    submitButton.textContent = "Submit Payment Proof";
  }
});

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxWidth = 1100;
        if (width > maxWidth) { height = Math.round(height * (maxWidth / width)); width = maxWidth; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        let quality = 0.62;
        let result = canvas.toDataURL("image/jpeg", quality);
        while (result.length > 650000 && quality > 0.22) {
          quality -= 0.08;
          result = canvas.toDataURL("image/jpeg", quality);
        }
        if (result.length > 850000) return reject(new Error("Screenshot is too large. Please use a smaller screenshot."));
        resolve({ name:file.name, type:"image/jpeg", size:result.length, content:result });
      };
      img.onerror = () => reject(new Error("Unable to read screenshot."));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error("Unable to read uploaded file."));
    reader.readAsDataURL(file);
  });
}

function showMessage(text, error) {
  message.classList.remove("hidden");
  message.classList.toggle("error", !!error);
  message.textContent = text;
}
