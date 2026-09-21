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
