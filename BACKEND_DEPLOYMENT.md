# CineShelf NEXUS backend deployment (Google Cloud Run)

GitHub Pages can host the browser frontend, but it cannot run `server.ts`. Temporary Guest/Friend login APIs, room creation, media uploads, and the multiplayer WebSocket server must run on a persistent Node server.

This repository now includes a `Dockerfile` for the complete Express + WebSocket backend.

## 1. Deploy the backend

Prerequisites: a Google Cloud project with billing enabled, Cloud Run and Cloud Build enabled, and the Google Cloud CLI installed and authenticated.

From the repository root, run:

```bash
gcloud run deploy cineshelf-nexus-api \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --timeout 3600 \
  --min 1 \
  --max 1 \
  --set-env-vars CORS_ALLOWED_ORIGINS=https://harshiiiit-bh.github.io
```

Use a region close to your main users. The service URL printed by the command will look like `https://cineshelf-nexus-api-xxxxx-xx.a.run.app`.

Verify it by opening:

```
https://YOUR-CLOUD-RUN-URL/api/health
```

It should return JSON with `"status":"ok"`.

### Why one instance?

Room membership, temporary login sessions, WebSocket subscriptions, and uploaded room files are currently held in server memory or the instance's temporary filesystem. Keep the service at one instance for this MVP so users in a room reach the same in-memory room manager. A process restart or redeployment still clears those temporary rooms/sessions; durable multiplayer state needs a shared database and media storage.

The `--min 1` setting keeps one instance warm for WebSocket sessions but can incur ongoing Cloud Run charges. For a cost-saving test environment, use `--min 0`; expect rooms to disappear when the instance stops.

## 2. Connect GitHub Pages to Cloud Run

In the GitHub repository, open **Settings → Secrets and variables → Actions → Variables** and create this repository variable:

- Name: `VITE_API_BASE_URL`
- Value: the Cloud Run HTTPS URL, with no trailing slash (for example, `https://cineshelf-nexus-api-xxxxx-xx.a.run.app`).

This is a public service URL, so it belongs in Actions **Variables**, not Secrets.

The Pages workflow injects this value at Vite build time. Open **Actions → Build and deploy CineShelf NEXUS to GitHub Pages → Run workflow** to rebuild and publish the frontend with the backend URL embedded.

## 3. Verify multiplayer

1. Open the GitHub Pages website.
2. Continue as Guest.
3. Choose **Explore 3D Theatre with AI Bots** to create a bot room.
4. Confirm that the room opens and the WebSocket status connects.
5. Then create a Friend Mode login and test the private-room invite flow from a second browser/device.

The backend allows CORS from `https://harshiiiit-bh.github.io` by default. Add any additional trusted frontend origins to `CORS_ALLOWED_ORIGINS` as a comma-separated list.

## Important production limitations

- The production API accepts only server-issued Guest/Friend temporary tokens. Development sandbox tokens and unverified Firebase JWT payloads are rejected in production; Firebase sign-in needs server-side ID-token verification before its account can use multiplayer endpoints.
- The temporary Login ID/code manager is not a durable account database. Production intentionally does not restore sessions from the container filesystem.
- Room state and uploaded room media are temporary and are lost on instance restart. Guest/Friend temporary sessions are also lost on restart or instance replacement.
- For reliable multi-instance scaling, persistent login/session storage, shared room state (for example Firestore/Redis), and object storage are required.
- Do not store service-account credentials or API secrets in the browser's `VITE_*` variables.
