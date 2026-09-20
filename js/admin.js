import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth,onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore,collection,getDocs,query,orderBy } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),box=document.querySelector('#requests');
onAuthStateChanged(auth,async user=>{if(!user){location.href='../login.html';return;}const me=await getDocs(query(collection(db,'users')));const mine=me.docs.find(d=>d.id===user.uid);if(!mine||mine.data().role!=='admin'){alert('Admin access required.');location.href='../client/dashboard.html';return;}load();});
async function load(){try{const snap=await getDocs(query(collection(db,'projects'),orderBy('createdAt','desc')));if(snap.empty){box.innerHTML='<div class="panel"><p class="muted">No project requests yet.</p></div>';return;}box.innerHTML=snap.docs.map(d=>{const p=d.data();return `<article class="panel"><span class="pill">${p.status||'Pending'}</span><h2>${esc(p.name||'Untitled')}</h2><p>${esc(p.clientEmail||'')}</p><p>${esc(p.requirements||'')}</p><a class="btn" href="editor.html?id=${d.id}">Open editor →</a></article>`}).join('');}catch(e){box.innerHTML='<div class="notice error">'+esc(e.message)+'</div>';}}
function esc(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
