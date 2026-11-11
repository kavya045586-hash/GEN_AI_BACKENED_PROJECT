# Interview AI - Backend

Node.js / Express / MongoDB API for the Interview AI project. Works on its own, so you can test everything with Postman and add the React frontend later.

## Features
- Register, login, logout (JWT in an httpOnly cookie, token blacklist on logout), get current user
- Upload a resume PDF + job description + self description
- AI interview report (Gemini): match score, technical questions, behavioral questions, skill gaps, 7-day preparation plan, role title
- AI tailored resume PDF (plain black-and-white, ATS friendly)
- Reports saved per user (list, view, delete)

## Folder structure
```
Backend/
  server.js                      starts DB + server
  package.json
  .env.example                   copy to .env and fill in
  postman_collection.json        import into Postman
  src/
    app.js                       express setup + routes
    config/database.js
    models/                      user, blacklist, interviewReport
    middleware/                  auth, file upload (multer), error handler
    controller/                  auth, interview
    routes/                      auth, interview
    services/                    ai.service.js (Gemini), pdf.service.js (resume PDF)
```

## Setup
1. Install Node 18.18+ (Node 20 or 22 recommended).
2. In this folder run `npm install`
3. Copy `.env.example` to `.env` and fill in:
   - `MONGODB_URI` - MongoDB Atlas connection string (allow your IP in Atlas > Network Access)
   - `JWT_SECRET` - any long random string
   - `GEMINI_API_KEY` - from Google AI Studio
   - `GEMINI_MODEL` - optional; change it if the default model is retired
4. `npm run dev` (auto-restarts on changes) or `npm start`

You should see `Connected to MongoDB successfully` and `Server running on http://localhost:3000`.

## API
| Method | URL | Auth | Body |
|---|---|---|---|
| GET | /api/health | no | |
| POST | /api/auth/register | no | JSON `{name, email, password}` |
| POST | /api/auth/login | no | JSON `{email, password}` |
| GET | /api/auth/get-me | yes | |
| GET | /api/auth/logout | yes | |
| POST | /api/interview | yes | form-data: `resume` (PDF file), `jobDescription`, `selfDescription` |
| GET | /api/interview | yes | |
| GET | /api/interview/:id | yes | |
| DELETE | /api/interview/:id | yes | |
| POST | /api/interview/resume/pdf/:id | yes | none, returns a PDF |

Notes:
- `jobDescription` is required, plus either a resume PDF or a `selfDescription`.
- Instead of a file you can send a `resumeText` field with pasted resume text.
- Resume PDFs must contain real text (scanned images are not supported) and be 5 MB or smaller.

## Test with Postman
1. Import `postman_collection.json`.
2. Run the requests in order: Register, Login, Get me, Generate interview report, and so on.
3. Login sets the cookie, and Postman sends it on later requests automatically.
4. "Generate interview report" saves `reportId` automatically, so the report and PDF requests work right after it.
5. For the PDF request use the arrow next to Send, then **Send and Download**.

## Troubleshooting
- **MONGODB_URI is not set**: the `.env` file is missing or the variable name is different.
- **Mongo connection error**: wrong password, or your IP is not allowed in Atlas.
- **401 Unauthorized**: log in again; the cookie may have expired or been cleared by logout.
- **AI generation failed**: check `GEMINI_API_KEY`, quota, and `GEMINI_MODEL` in `.env`.
- **Never commit `.env` or `node_modules`** (the included `.gitignore` already ignores them).
