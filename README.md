# Post Screenshot

Minimal web app for batch screenshotting public social posts (Facebook / Instagram / Threads) with mobile viewport and post-only capture.

## Local Run

1. Install dependencies
   - `npm install`
2. Start Redis
   - Example: `docker run --rm -p 6379:6379 redis:7`
3. Copy env
   - `cp .env.example .env`
4. Start app
   - `npm start`
5. Open
   - `http://localhost:3000`

## API

- `POST /api/jobs` body: `{ "urls": ["..."] }`
- `GET /api/jobs/:id`
- `GET /api/jobs/:id/download`

## Notes

- Only public posts are supported.
- If login wall is detected, item fails with `LOGIN_WALL` and no screenshot is produced.
- Worker concurrency defaults to `4`.

## Zeabur

- Service command: `npm start`
- Required env: `REDIS_URL`
- Recommended env: `WORKER_CONCURRENCY=4`
