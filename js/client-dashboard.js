import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
const app=initializeApp(firebaseConfig); const auth=getAuth(app); const db=getFirestore(app);
onAuthStateChanged(auth,async user=>{ if(!user)return location.href='../login.html'; const snap=await getDoc(doc(db,'users',user.uid)); const data=snap.exists()?snap.data():{}; document.querySelector('#clientName').textContent=data.fullname||user.displayName||'Client'; document.querySelector('#clientEmail').textContent=data.email||user.email; });
document.querySelector('#logout').onclick=async()=>{await signOut(auth);location.href='../login.html';};
