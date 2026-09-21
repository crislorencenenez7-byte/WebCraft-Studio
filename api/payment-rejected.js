export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { clientEmail, clientName, projectName, projectId, paymentReference } = req.body || {};
  if (!clientEmail) return res.status(400).json({ error: 'Missing clientEmail' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY is not configured' });
  const subject = `WebCraft Studio — Payment Rejected${projectName ? `: ${projectName}` : ''}`;
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Payment Rejected</h2><p>Hello ${escapeHtml(clientName || 'Client')},</p><p>Your payment proof for <strong>${escapeHtml(projectName || 'your website project')}</strong> was rejected by the WebCraft Studio admin.</p><p><strong>Project ID:</strong> ${escapeHtml(projectId || '')}</p><p><strong>Reference submitted:</strong> ${escapeHtml(paymentReference || 'None')}</p><p>The project has been hidden from your client portal. If you still want to continue, submit a new website request/payment proof as instructed by the admin.</p><p>— WebCraft Studio</p></div>`;
  const response = await fetch('https://api.resend.com/emails', { method:'POST', headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'}, body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL || 'WebCraft Studio <onboarding@resend.dev>',to:[clientEmail],subject,html}) });
  const data = await response.json();
  if (!response.ok) return res.status(response.status).json(data);
  return res.status(200).json({ ok:true, id:data.id });
}
function escapeHtml(value){return String(value ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
