# JobTrack

Simple job application tracker. Add your applications → track their status → view basic statistics.

## Features

1. Add application
2. View applications
3. Edit application
4. Delete application
5. Change status
6. Search / filter
7. Dashboard statistics

## Tech stack

- **Frontend:** React + Vite (JavaScript, CSS)
- **Backend:** Node.js + Express
- **Data:** JSON file (`server/applications.json`)
- **Communication:** REST API

## Project structure

```
JobTrack/
├── client/
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── App.css
│       ├── components/
│       │   ├── Dashboard.jsx
│       │   ├── ApplicationForm.jsx
│       │   └── ApplicationList.jsx
│       └── services/
│           └── api.js
├── server/
│   ├── server.js
│   └── applications.json
├── package.json
└── README.md
```

## Getting started

### 1. Install dependencies

From the project root:

```bash
npm run install-all
```

This installs dependencies for both `server/` and `client/`.

(If you don't have `concurrently` installed for the root `dev` script, run `npm install` in the root first, or just start each side manually as shown below.)

### 2. Run the app

**Option A — one command (runs both):**

```bash
npm run dev
```

**Option B — two terminals:**

```bash
# Terminal 1
cd server
npm install
node server.js
```

```bash
# Terminal 2
cd client
npm install
npm run dev
```

- Backend runs at `http://localhost:5000`
- Frontend runs at `http://localhost:5173` (Vite dev server proxies `/api` calls to the backend — see `client/vite.config.js`)

Open `http://localhost:5173` in your browser.

## API reference

| Method | Endpoint                | Description                          |
|--------|--------------------------|--------------------------------------|
| GET    | `/api/applications`      | List applications (supports `?search=` and `?status=`) |
| POST   | `/api/applications`      | Create a new application             |
| PUT    | `/api/applications/:id`  | Edit an application (also used for status change) |
| DELETE | `/api/applications/:id`  | Delete an application                |
| GET    | `/api/stats`             | Dashboard statistics                 |

### Application object

```json
{
  "id": 1,
  "company": "EY",
  "role": "Data Analyst",
  "status": "Interview",
  "date": "2026-08-10"
}
```

Valid `status` values: `Applied`, `Interview`, `Selected`, `Rejected`.

## Notes

- Data persists to `server/applications.json` — no database required.
- This is intentionally scoped to the 7 features above. No resume upload, interview scheduling, auth, or admin panel.
