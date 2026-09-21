# WebCraft Studio — Firebase Login/Signup V3

**Your vision. Our code. Your website.**

## Structure
- `index.html` — public landing page
- `login.html` — Firebase Email/Password login
- `signup.html` — Firebase account registration + email verification
- `client/dashboard.html` — client portal
- `client/request.html` — authenticated project request form
- `client/project.html` — client's submitted projects
- `admin/dashboard.html` — admin project list
- `admin/editor.html` — admin multi-file code editor
- `js/firebase-config.js` — paste your Firebase Web App config here

## Firebase
Authentication: Email/Password must be enabled.
Firestore rules should allow users, projects, project files, and client-owned projects as configured in your Firebase console.

### First admin
1. Sign up normally.
2. Verify your email and log in.
3. In Firestore, open `users/{your UID}`.
4. Change `role` from `client` to `admin`.
5. Open `admin/dashboard.html`.

### Important
This version does not use Firebase Storage. Design image metadata is stored with the project request, not the image bytes. Add an external image/file host later if you want actual screenshot uploads without upgrading Firebase Storage.


## Payment verification flow

Client submits a GCash reference and screenshot from `client/payment.html`. The proof is compressed and stored in the project document so no Firebase Storage is required. Admin verifies payment inside `admin/editor.html`. Accept changes the project to `Coding`; Reject changes it to `Payment Rejected`, hides it from the client portal, and sends a rejection email when Resend is configured.

### Optional Vercel environment variables
- `RESEND_API_KEY`
- `ADMIN_EMAIL`
- `RESEND_FROM_EMAIL` (optional; defaults to Resend test sender)

The Firebase Web App config remains in `js/firebase-config.js`, including the existing public `apiKey`.
