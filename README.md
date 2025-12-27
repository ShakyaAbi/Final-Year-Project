**Prerequisites:** Node.js

Frontend setup:
1. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` (defaults to `http://localhost:4000/api/v1`).
2. Install dependencies: `npm install`
3. Start the Vite dev server: `npm run dev`
4. Open http://localhost:5173 in your browser.

Backend: see `backend/README.md` for running the API (Prisma + Postgres). Make sure the API base URL matches `VITE_API_BASE_URL`.
