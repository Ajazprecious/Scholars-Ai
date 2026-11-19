# AJAZ AI — standalone study tutor

AJAZ AI is a React/Vite learning app backed by an independent Node.js + Express API and PostgreSQL. The Base44 SDK and Vite plugin have been removed. Existing Base44 live data is intentionally not imported; the new installation starts with a clean database.

## Stack
- React 18, Vite 6, React Router and Tailwind
- Node.js 20+, Express and PostgreSQL 15+
- Custom email/password authentication, email verification, Google sign-in and secure HttpOnly cookie sessions
- Server-side document extraction, AI lesson and quiz generation, server-side marking, persisted tutor chat, generated speech and realtime voice sessions

## Local setup

### 1. Frontend
```bash
npm install
cp .env.example .env.local
npm run dev
```
The Vite dev server proxies `/api` to `http://localhost:4000`.

### 2. API and database
```bash
cd server
npm install
cp .env.example .env
# Create a PostgreSQL database named ajazai, then set DATABASE_URL in server/.env
npm run db:migrate
npm run dev
```
Open `http://localhost:5173`. The API health check is `http://localhost:4000/api/health`.

Configure these values in `server/.env`:
- `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `APP_URL`, `CLIENT_ORIGIN`, SMTP values for verification and password reset emails
- `GOOGLE_CLIENT_ID` and the same value as frontend `VITE_GOOGLE_CLIENT_ID` for Google sign-in
- `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`, `OPENAI_TTS_MODEL`, `OPENAI_REALTIME_MODEL` for AI features
- `UPLOAD_DIR` for private uploaded source documents; use persistent disk storage in production

Never expose database, SMTP, JWT or AI provider secrets in `VITE_*` variables.

## Feature coverage
- **Documents and reader:** private upload, PDF/DOCX/PPTX/TXT extraction, image OCR via the configured vision-capable AI provider, topic/heading segmentation, section navigation, saved reading position and document deletion.
- **AI lessons:** simplified lesson, key concepts, related materials, exam tips, real-world context and generated concept-diagram source.
- **Tutor:** context-aware text chat with persisted messages, browser speech input, generated TTS with voice/speed controls, and realtime WebRTC voice sessions when provider access is configured.
- **Assessments:** easy and advanced quiz generation, server-only answer keys, server-side answer checks and scoring, attempt history, 60% pass mark and two-stage mastery.
- **Dashboard/accessibility:** per-user document list and completion, loading/error states, semantic controls, labels, keyboard-operable section/answer controls and live feedback.
- **Authentication:** registration, email verification, login/logout, refresh sessions, password reset and Google sign-in.

## Deployment notes (Render or similar)
1. Create a managed PostgreSQL database and set `DATABASE_URL` on the API service.
2. Deploy `server/` as a Node web service with build/install command `npm install` and start command `npm start` (working directory `server`). Run `npm run db:migrate` once after setting the database URL.
3. Attach a persistent disk to the API service and set `UPLOAD_DIR` to its mount path (for example `/var/data/ajazai-uploads`). The default local filesystem is not durable on ephemeral hosts.
4. Configure `NODE_ENV=production`, strong unique JWT secrets, `APP_URL`, `CLIENT_ORIGIN`, SMTP, Google OAuth and AI provider credentials.
5. Deploy the project root as a static site with build command `npm install && npm run build` and publish directory `dist`. Set `VITE_API_URL` to the API origin if the frontend and API do not share an origin. Ensure cookie credentials and CORS origins match exactly; use HTTPS for both.
6. Add the deployed frontend origin to the Google OAuth authorized JavaScript origins. Use the same OAuth client ID in frontend and API settings.
7. Verify `/api/health`, email verification, login/logout, document upload, lesson generation, quiz submission, TTS and realtime voice before launch.

## Operational limits to review before production
- The current upload processor runs synchronously in the API request. Large documents may need a background queue and request timeout tuning.
- Local disk storage requires a persistent volume; object storage (S3-compatible) is recommended for multi-instance scaling.
- Image OCR and all AI/tutor features require a configured compatible AI provider, available quota and model access. Realtime voice additionally requires browser microphone permission and a supported realtime model.
- Automated end-to-end tests, security review, malware scanning, backup/restore rehearsal and WCAG 2.2 AA audit remain necessary before public production use.
