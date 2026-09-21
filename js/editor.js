import { firebaseConfig } from './firebase-config.js';
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const app=getApps().length?getApp():initializeApp(firebaseConfig);
const auth=getAuth(app),db=getFirestore(app);
const id=new URLSearchParams(location.search).get('id');
const code=document.querySelector('#code'),name=document.querySelector('#fileName'),msg=document.querySelector('#editorMessage');
const paymentTitle=document.querySelector('#paymentTitle'),paymentStatus=document.querySelector('#paymentStatus'),paymentDetails=document.querySelector('#paymentDetails'),paymentActions=document.querySelector('#paymentActions');
let current='index.html', project=null;

async function guard(){
  const user=auth.currentUser;
  if(!user){location.href='../login.html';return false;}
  const me=await getDoc(doc(db,'users',user.uid));
  if(!me.exists()||String(me.data().role).toLowerCase()!=='admin'){alert('Admin access required.');location.href='../client/dashboard.html';return false;}
  return true;
}

onAuthStateChanged(auth,async ()=>{
  if(!(await guard())||!id)return;
  try{
    const p=await getDoc(doc(db,'projects',id));
    if(!p.exists()){showMessage('Project not found.',true);return;}
    project=p.data();
    renderPayment();
    await loadFile(current);
  }catch(e){showMessage(e.message||'Unable to load project.',true);}
});

function renderPayment(){
  paymentTitle.textContent=`${project.name||'Untitled'} — ${project.clientName||project.clientEmail||'Client'}`;
  const status=String(project.paymentStatus||'pending').toLowerCase();
  const ref=project.paymentReference||'No reference submitted';
  paymentDetails.innerHTML=`<p><strong>Client:</strong> ${esc(project.clientName||'')}</p><p><strong>Email:</strong> ${esc(project.clientEmail||'')}</p><p><strong>Package:</strong> ${esc(project.package||'')}</p><p><strong>Amount:</strong> ₱${Number(project.price||0).toLocaleString('en-PH')}</p><p><strong>GCash Reference:</strong></p><div class="ref-box">${esc(ref)}</div>`;
  paymentActions.innerHTML='';

  if(project.paymentProof?.content){
    const img=document.createElement('img'); img.className='payment-proof'; img.src=project.paymentProof.content; img.alt='Client payment screenshot';
    paymentDetails.appendChild(document.createElement('p')).textContent='Payment Screenshot:';
    paymentDetails.appendChild(img);
  }else{
    paymentDetails.insertAdjacentHTML('beforeend','<p class="muted">No payment screenshot submitted yet.</p>');
  }

  if(status==='verified'){
    paymentStatus.textContent='✓ Payment verified. Coding is allowed.';
  }else if(status==='submitted'){
    paymentStatus.textContent='⏳ Payment proof submitted — choose Accept or Reject.';
    addAction('Accept Payment','accept'); addAction('Reject Payment','reject');
  }else if(status==='rejected'){
    paymentStatus.textContent='✕ Payment rejected. The client portal hides this project.';
  }else if(status==='pending'){
    paymentStatus.textContent='Payment has not been submitted yet.';
  }else{
    paymentStatus.textContent=`Payment status: ${status}`;
  }
}

function addAction(label,type){
  const b=document.createElement('button'); b.className='btn'+(type==='reject'?' reject':''); b.textContent=label; b.type='button';
  b.onclick=()=> type==='accept'?verifyPayment():rejectPayment(); paymentActions.appendChild(b);
}

async function verifyPayment(){
  if(!confirm('Accept this payment and allow coding to begin?'))return;
  try{
    await updateDoc(doc(db,'projects',id),{paymentStatus:'verified',paymentVerifiedAt:serverTimestamp(),paymentRejectedAt:null,status:'Coding',updatedAt:serverTimestamp()});
    project.paymentStatus='verified';project.status='Coding';renderPayment();showMessage('Payment accepted. Project is now Coding.',false);
  }catch(e){showMessage(e.message,true);}
}

async function rejectPayment(){
  if(!confirm('Reject this payment? The project will disappear from the client portal and the client will be notified by email.'))return;
  try{
    await updateDoc(doc(db,'projects',id),{paymentStatus:'rejected',paymentRejectedAt:serverTimestamp(),status:'Payment Rejected',updatedAt:serverTimestamp()});
    project.paymentStatus='rejected';project.status='Payment Rejected';renderPayment();
    try{
      const response=await fetch('../api/payment-rejected.js',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:id,clientEmail:project.clientEmail,clientName:project.clientName,projectName:project.name,paymentReference:project.paymentReference})});
      if(!response.ok)console.warn('Rejection email endpoint returned an error.');
    }catch(emailError){console.warn('Rejection email failed:',emailError);}
    showMessage('Payment rejected. The project is now hidden from the client portal.',false);
  }catch(e){showMessage(e.message,true);}
}

async function loadFile(fileName){
  current=fileName; name.value=current; code.value='';
  const s=await getDoc(doc(db,'projects',id,'files',current));
  if(s.exists())code.value=s.data().content||'';
}
async function save(){
  if(!id)return;
  await setDoc(doc(db,'projects',id,'files',current),{name:current,content:code.value,updatedAt:serverTimestamp()},{merge:true});
  if(String(project?.paymentStatus).toLowerCase()==='verified')await updateDoc(doc(db,'projects',id),{status:'Coding',updatedAt:serverTimestamp()});
  showMessage(current+' saved.',false);
}

document.querySelectorAll('.file').forEach(b=>b.onclick=async()=>{await save();document.querySelectorAll('.file').forEach(x=>x.classList.remove('active'));b.classList.add('active');await loadFile(b.dataset.file);});
document.querySelector('#saveCode').onclick=save;
document.querySelector('#preview').onclick=()=>{const w=window.open();w.document.write(code.value);w.document.close();};
document.querySelector('#deliver').onclick=async()=>{try{await updateDoc(doc(db,'projects',id),{status:'Completed',updatedAt:serverTimestamp()});project.status='Completed';showMessage('Project marked completed.',false);}catch(e){showMessage(e.message,true);}};
function showMessage(text,error){msg.classList.remove('hidden');msg.classList.toggle('error',!!error);msg.textContent=text;}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
