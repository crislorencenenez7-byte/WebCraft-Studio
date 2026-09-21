export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) return res.status(200).json({ ok:false, skipped:true, reason:'Email environment variables are not configured' });
  // The client already saved the payment proof in Firestore. This endpoint is only a lightweight notification hook.
  const response = await fetch('https://api.resend.com/emails', { method:'POST', headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'}, body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL || 'WebCraft Studio <onboarding@resend.dev>',to:[process.env.ADMIN_EMAIL],subject:'WebCraft Studio — New Payment Proof Submitted',html:'<p>A client has submitted payment proof. Open the Admin Dashboard and the project editor to verify the screenshot and GCash reference.</p>'}) });
  const data=await response.json(); if(!response.ok)return res.status(response.status).json(data); return res.status(200).json({ok:true,id:data.id});
}
