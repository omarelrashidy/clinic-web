# عيادة د. أحمد سالم — Booking System

Static client + staff dashboard, backed by a Google Apps Script Web App (acts as the API + database via Google Sheets).

## Structure
```
public/
  index.html   → client booking site (was clinic-client-fixed__3_.html)
  staff.html   → staff/admin dashboard (was clinic-staff-fixed.html)
backend/
  google-apps-script-backend.js → paste into Apps Script (not deployed by Vercel)
vercel.json    → static hosting config (clean URLs, /staff route)
package.json   → marks project as static (no build step)
```

## 1. Deploy the backend (Google Apps Script)
1. Open the target Google Sheet → Extensions → Apps Script.
2. Replace the default code with `backend/google-apps-script-backend.js`.
3. Update `SPREADSHEET_ID` at the top of the file if you're using a different sheet.
4. Save, then **Deploy → New deployment → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the resulting Web App URL (ends in `/exec`).

## 2. Deploy the frontend to Vercel
1. Push this repo to GitHub.
2. In Vercel: **New Project → Import** the repo. Vercel auto-detects it as a static site (no framework, no build command needed — `outputDirectory` is `public`).
3. Deploy. You'll get a URL like `https://your-project.vercel.app`.
4. Staff dashboard is available at `https://your-project.vercel.app/staff`.

## 3. Connect frontend to backend
Both `index.html` and `staff.html` store the Apps Script URL in `localStorage` (key `clinic_script_url`), set via the in-page settings panel (default password: `0000`). After deploying:
1. Open the live site.
2. Open Settings (in either the client or staff page) and paste the Apps Script Web App URL from step 1.
3. Save — this is stored per-browser in `localStorage`, so each device/browser needs to be configured once.

No environment variables or server-side code are required since the Apps Script URL is configured client-side.

## Notes
- This is a pure static deployment — Vercel serves the HTML/CSS/JS as-is, no serverless functions involved.
- CORS: requests to Apps Script from the booking form use `mode: 'no-cors'` for writes (fire-and-forget) and `mode: 'cors'` for reads, matching the existing Apps Script `doGet`/`doPost` setup.
