# Cloud Deployment Runbook (Backend + Shared MySQL)

This runbook gives a predictable setup for marking/demo use where uptime does not depend on one teammate's laptop.

## Target architecture

- Browser -> Node/Express backend (cloud) -> MySQL database (cloud)
- Result: one shared set of accounts/data for the whole team.

## Why this is recommended

- A laptop-hosted backend/database can go offline anytime (sleep, network drop, restart).
- Marking/demo windows are fixed; cloud hosting is more reliable for those windows.
- Secrets stay in host environment variables, not in source control.

## Step 1: Choose host(s)

Recommended for this project:
- Railway for backend + MySQL in one platform.

Alternative:
- Render for backend and a separate MySQL provider (Render is commonly used for app hosting; pair with external MySQL).

Why:
- Railway is usually the fastest path for Node + MySQL student projects.
- Render is fine for backend but needs an external MySQL service for this stack.

## Step 2: Prepare environment variables

Use the root `.env.example` as the source of truth.

Required:
- `DATABASE_URL` (preferred if provider gives it)
or
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

Optional but commonly needed for managed DBs:
- `DB_SSL=true`
- `DB_SSL_REJECT_UNAUTHORIZED=true` (set false only if provider explicitly requires it)

Why:
- The project now supports both `DATABASE_URL` and split `DB_*` values in `Database/db.js`.

## Step 3: Create cloud MySQL

1. Create a MySQL instance on your chosen provider.
2. Copy the connection values.
3. Keep credentials private (only in host secrets, never in git).

Why:
- This becomes the single shared database all teammates use.

## Step 4: Deploy backend

1. Connect this GitHub repo to host.
2. Build/start:
   - Build: `npm install`
   - Start: `npm start`
3. Add environment variables from Step 2 in the host dashboard.

Why:
- A cloud backend means API availability is not tied to your local machine.

## Step 5: Initialize schema in cloud DB

Run `Database/database.sql` against the cloud MySQL once.

Why:
- The app expects the `group_project.users` table structure before login/register works.

## Step 6: Verify DB connectivity

From local machine (with cloud env vars set):

```bash
npm run db:ping
```

Expected:
- `Database connection successful.`

Why:
- Confirms credentials, SSL mode, network access, and selected DB are correct.

## Step 7: Verify API behavior

1. Test `POST /register` on deployed backend URL.
2. Test `POST /login` with the created account.
3. Test `GET /users` to confirm shared records are visible.

Why:
- Confirms end-to-end behavior for marking: write + read + authentication path.

## Step 8: Team usage model

- Teammates use the deployed backend URL.
- Do not share DB credentials with everyone unless needed for admin tasks.
- If frontend is local, point API base URL to deployed backend.

Why:
- Centralized API gives consistent behavior and limits accidental DB misuse.

## Step 9: Demo/marking reliability checklist

- [ ] Backend service status is healthy on host dashboard
- [ ] MySQL instance is running
- [ ] Correct env vars exist in backend host
- [ ] A test login works on deployed URL
- [ ] At least one teammate verified access from another network

## Notes for this repository

- Cloud-ready DB config: `Database/db.js`
- Env template for team: `.env.example`
- Connectivity check command: `npm run db:ping`
- Connectivity check script: `scripts/test_db_connection.js`
