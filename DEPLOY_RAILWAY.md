# Railway Deployment (Bun API)

This project should deploy the API from `server/` (not Vercel serverless `api/*.js`).

## 1. Create Railway service
- New Project -> Deploy from GitHub repo
- In the service settings, set **Root Directory** to `server`
- Railway will detect `server/Dockerfile`

## 2. Required environment variables
Set these in Railway -> Variables:

- `ANTHROPIC_API_KEY=...`
- `OPENAI_API_KEY=...`
- `GEMINI_API_KEY=...`
- `API_KEYS=key_one,key_two` (required for external tool access; comma-separated)

Optional:
- `PORT` (Railway usually injects this automatically)

## 3. Healthcheck
Use:
- Path: `/health`
- Expected: `200` with JSON `{ "ok": true, ... }`

`/health` is intentionally public so Railway health checks do not fail when API key auth is enabled.

## 4. Persistent data (recommended)
The app uses SQLite in `data/hooks.db` and stores job state there.
Railway filesystem is ephemeral unless you attach a volume.

Recommended:
- Attach a Railway volume
- Mount path: `/app/data`

## 5. Verify deployment
Replace `<API_URL>` and `<API_KEY>`:

```bash
curl <API_URL>/health
curl -H "X-API-Key: <API_KEY>" <API_URL>/api/dbt/topics
```

If auth is correct, `/api/dbt/topics` returns JSON topic list.

## 6. Third-party tool base URL
Use this base URL in your automation tool:

- `<API_URL>/api`

Then call:
- `POST /dbt/jobs`
- `GET /dbt/jobs/:id`
