# AjazAI API

Express API for the standalone AjazAI web client.

## Local setup
1. Use Node.js 20+ and PostgreSQL 15+.
2. `cd server && npm install`.
3. Copy `.env.example` to `.env`; set `DATABASE_URL`, unique JWT secrets and `APP_URL`.
4. Create the database, then run `npm run db:migrate`.
5. Configure SMTP, Google OAuth and OpenAI-compatible AI settings for those features.
6. Run `npm run dev`; health check: `GET /api/health`.

## API groups
- `/api/auth`: register, verify email, login, Google sign-in, refresh, logout, forgot/reset password and current user.
- `/api/learning/documents`: list, upload, detail and delete owned study materials.
- `/api/learning/sections`: section detail and AI lesson generation.
- `/api/learning/progress`: save current reading position.
- `/api/learning/tutor`: persisted chat, generated TTS and realtime session creation.
- `/api/learning/quizzes`: generate, retrieve sanitized quiz, check one answer and submit for server-side marking.
- `/api/learning/attempts`, `/api/learning/history`, `/api/learning/dashboard`: assessment history and dashboard data.

Uploaded files are private and named with random identifiers. `UPLOAD_DIR` should point to a persistent volume in production. Never expose provider secrets to the browser. Configure exact `CLIENT_ORIGIN` values and HTTPS. For a cross-site frontend/API deployment, set `COOKIE_SAME_SITE=none` and keep `secure` cookies enabled; same-origin deployment is simpler.
