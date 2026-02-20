# Social Post Screenshot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Zeabur-deployable web app that accepts public Facebook/Instagram/Threads URLs and returns per-post mobile-layout screenshots as a ZIP.

**Architecture:** Use an Express API with BullMQ queue and in-process worker. Persist job state in Redis and artifacts on local disk under `data/jobs`. Worker runs Playwright with mobile viewport and captures only post content element.

**Tech Stack:** Node.js, Express, BullMQ, ioredis, Playwright, Vitest, Supertest, Archiver

---

### Task 1: Project scaffolding and runtime wiring

**Files:**
- Create: `package.json`
- Create: `src/config.js`
- Create: `src/server.js`
- Create: `src/app.js`
- Create: `src/queue.js`
- Create: `src/worker/index.js`
- Create: `src/storage.js`
- Create: `src/public/index.html`
- Create: `.env.example`

**Step 1: Write the failing test**
- Add API health test expecting `/api/health` 200 and JSON shape.

**Step 2: Run test to verify it fails**
- Run: `npm test -- tests/api/health.test.js`
- Expected: FAIL because app/server not implemented.

**Step 3: Write minimal implementation**
- Add app with `/api/health` route.
- Add server bootstrap and static file serving.

**Step 4: Run test to verify it passes**
- Run: `npm test -- tests/api/health.test.js`
- Expected: PASS.

**Step 5: Commit**
```bash
git add package.json src/config.js src/server.js src/app.js src/queue.js src/worker/index.js src/storage.js src/public/index.html .env.example tests/api/health.test.js
git commit -m "feat: bootstrap app with queue and health endpoint"
```

### Task 2: Input validation and job lifecycle API

**Files:**
- Create: `src/routes/jobs.js`
- Create: `src/services/jobStore.js`
- Create: `src/shared/platform.js`
- Modify: `src/app.js`
- Test: `tests/api/jobs.test.js`
- Test: `tests/shared/platform.test.js`

**Step 1: Write the failing test**
- Add tests for:
  - Reject empty URL list.
  - Reject >200 URLs.
  - Accept valid list and return `jobId`.
  - Platform detection behavior.

**Step 2: Run test to verify it fails**
- Run: `npm test -- tests/api/jobs.test.js tests/shared/platform.test.js`
- Expected: FAIL due to missing routes/services.

**Step 3: Write minimal implementation**
- Implement URL normalization/validation.
- Create job record in Redis.
- Enqueue one queue item per URL.
- Add job status fetch endpoint.

**Step 4: Run test to verify it passes**
- Run: `npm test -- tests/api/jobs.test.js tests/shared/platform.test.js`
- Expected: PASS.

**Step 5: Commit**
```bash
git add src/routes/jobs.js src/services/jobStore.js src/shared/platform.js src/app.js tests/api/jobs.test.js tests/shared/platform.test.js
git commit -m "feat: add job creation and status APIs"
```

### Task 3: Screenshot engine with login wall protection

**Files:**
- Create: `src/worker/screenshot.js`
- Create: `src/worker/loginWall.js`
- Create: `src/worker/selectors.js`
- Modify: `src/worker/index.js`
- Test: `tests/worker/loginWall.test.js`
- Test: `tests/worker/selectors.test.js`

**Step 1: Write the failing test**
- Add tests for login wall detector and selector strategies for each platform.

**Step 2: Run test to verify it fails**
- Run: `npm test -- tests/worker/loginWall.test.js tests/worker/selectors.test.js`
- Expected: FAIL because logic missing.

**Step 3: Write minimal implementation**
- Implement platform selectors + fallback.
- Implement login wall detection by URL/title/text patterns.
- Implement mobile viewport Playwright capture using `elementHandle.screenshot()` only.

**Step 4: Run test to verify it passes**
- Run: `npm test -- tests/worker/loginWall.test.js tests/worker/selectors.test.js`
- Expected: PASS.

**Step 5: Commit**
```bash
git add src/worker/screenshot.js src/worker/loginWall.js src/worker/selectors.js src/worker/index.js tests/worker/loginWall.test.js tests/worker/selectors.test.js
git commit -m "feat: implement post-only screenshot worker with login-wall guard"
```

### Task 4: ZIP packaging and download endpoint

**Files:**
- Create: `src/services/zipper.js`
- Modify: `src/services/jobStore.js`
- Modify: `src/routes/jobs.js`
- Test: `tests/api/download.test.js`

**Step 1: Write the failing test**
- Add tests for:
  - Download blocked while job running.
  - Download available when zip exists.

**Step 2: Run test to verify it fails**
- Run: `npm test -- tests/api/download.test.js`
- Expected: FAIL because download path not implemented.

**Step 3: Write minimal implementation**
- Build ZIP from successful image files after job completion.
- Expose `/api/jobs/:id/download` endpoint.

**Step 4: Run test to verify it passes**
- Run: `npm test -- tests/api/download.test.js`
- Expected: PASS.

**Step 5: Commit**
```bash
git add src/services/zipper.js src/services/jobStore.js src/routes/jobs.js tests/api/download.test.js
git commit -m "feat: add zip generation and download endpoint"
```

### Task 5: Minimal frontend workflow

**Files:**
- Modify: `src/public/index.html`
- Create: `src/public/app.js`
- Create: `src/public/styles.css`

**Step 1: Write the failing test**
- Add manual acceptance checklist (UI e2e smoke) in `docs/plans/2026-02-20-manual-checklist.md`.

**Step 2: Run test to verify it fails**
- Run manual checklist and confirm missing behavior.

**Step 3: Write minimal implementation**
- URL textarea and submit action.
- Job status polling.
- Per-item status list and download button.

**Step 4: Run test to verify it passes**
- Execute checklist and confirm all pass.

**Step 5: Commit**
```bash
git add src/public/index.html src/public/app.js src/public/styles.css docs/plans/2026-02-20-manual-checklist.md
git commit -m "feat: add minimal batch screenshot UI"
```

### Task 6: Verification and deploy readiness

**Files:**
- Create: `README.md`
- Create: `.gitignore`

**Step 1: Write the failing test**
- Add runbook checklist for local run + Zeabur env config.

**Step 2: Run test to verify it fails**
- Attempt full run without setup and confirm missing docs/env causes failure.

**Step 3: Write minimal implementation**
- Add setup docs, env vars, start commands.
- Document Zeabur service/process configuration.

**Step 4: Run test to verify it passes**
- Run: `npm test`
- Run: `npm run lint`
- Run: `npm run start` (smoke)
- Expected: tests pass, lint clean, server boots.

**Step 5: Commit**
```bash
git add README.md .gitignore
git commit -m "docs: add runbook and deployment instructions"
```
