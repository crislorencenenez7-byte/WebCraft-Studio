import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
const app=initializeApp(firebaseConfig); const auth=getAuth(app); const db=getFirestore(app);
export function requireClient(){onAuthStateChanged(auth,async user=>{if(!user){location.href='../login.html';return;} await user.reload(); if(!user.emailVerified){await signOut(auth);location.href='../login.html';return;}});}
export async function requireAdmin(){return new Promise(resolve=>onAuthStateChanged(auth,async user=>{if(!user){location.href='../login.html';return;} const snap=await getDoc(doc(db,'users',user.uid)); if(!snap.exists()||snap.data().role!=='admin'){alert('Admin access required.');location.href='../client/dashboard.html';return;} resolve({user,data:snap.data()});}));}
