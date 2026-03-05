# Local Shared Database Setup (No Cloud)

This setup keeps MySQL + backend on your machine while teammates use the same accounts/data.

## Important behavior

- Yes, your machine must be on and connected to the same network when others use the app.
- If your machine sleeps/restarts/disconnects, teammates lose access until it is back online.

## Architecture

- Teammate browser -> `http://YOUR_LOCAL_IP:3000` -> backend on your machine -> MySQL on your machine
- Teammates should call your backend API, not connect directly to MySQL.

## Step-by-step

## 1) Set environment variables

Create `.env` in project root from `.env.example`.

Minimum:
- `HOST=0.0.0.0`
- `PORT=3000`
- `DB_HOST=127.0.0.1`
- `DB_PORT=3306`
- `DB_USER=app_user`
- `DB_PASSWORD=...`
- `DB_NAME=group_project`

Why:
- `HOST=0.0.0.0` allows LAN devices to reach your backend process.

## 2) Start database and backend

1. Start MySQL service locally.
2. Run schema once:
   - `mysql -u root -p < Database/database.sql`
3. Start backend:
   - `npm run dev`

Why:
- Backend must be running to serve login/register endpoints.

## 3) Find your machine IP

Run:
- `ipconfig`

Use your IPv4 address (example `192.168.1.25`).

Why:
- Teammates need this address to reach your backend.

## 4) Open Windows firewall for backend port

Allow inbound TCP `3000` for private network.

Why:
- Without this, requests from teammates are blocked even if backend is running.

## 5) Share backend URL with teammates

- `http://YOUR_IPV4:3000`

Why:
- Everyone will hit one API and therefore one shared users table.

## 6) Verify shared accounts

1. Teammate A registers an account.
2. Teammate B logs in with that same account.

Why:
- Confirms all clients are using one backend + one DB.

## Optional: allow direct remote DB access (usually not needed)

Default recommendation: do not expose MySQL directly to teammates.

If you intentionally need remote DB login:
1. Configure MySQL bind address to listen on LAN (`0.0.0.0`).
2. Open firewall TCP `3306` (private network only).
3. Create user with host `%` using `scripts/create_app_user.js`:
   - set `APP_DB_HOST=%` in `.env`
   - run `node scripts/create_app_user.js`

Why:
- `%` allows logins from hosts other than localhost.
- This increases risk and should be limited to trusted private networks.
