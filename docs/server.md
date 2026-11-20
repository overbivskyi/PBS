# Server: API + database behind Tailscale Funnel

The site (GitHub Pages) talks to a small API on the team's server. The server sits in the team's
Tailscale network; Tailscale Funnel gives the API a public HTTPS address, so testers' browsers can reach it.

```
browser ──HTTPS──> https://<machine>.<tailnet>.ts.net  (Tailscale Funnel)
                         │
                         └─> server: node server/index.js on port 8787 ──> SQLite file
```

## What is in git

| Path | What |
|---|---|
| `server/index.js` | The API (plain Node, no packages). Uses the same matching logic as the site: `src/lib/matching.js` |
| `server/db.js` | Database schema (SQLite, built into Node 22.13+) and loading of the demo data from `src/data/*.json` |
| `server/admin.js` | Admin commands: reload demo data, create team accounts, delete testers' data |
| `server/pbs-api.service` | systemd user service file |

The database file itself (`server/data/pbs.sqlite`) is **not** in git: it holds testers' personal data.

## 1. Run the API on the server

Needs Node 22.13 or newer (`node -v`).

```bash
git clone https://github.com/overbivskyi/PBS.git ~/pbs
cd ~/pbs
npm run server:seed          # creates the database and loads the demo data
npm run server:team -- team@example.com 'a-strong-password' Olha Team   # one per team member
npm run server               # try it: http://localhost:8787/api/health
```

To keep it running, install it as a user service (no root needed; the admin enables linger once
with `sudo loginctl enable-linger <user>` so it keeps running after logout and starts on boot):

```bash
mkdir -p ~/.config/systemd/user && cp server/pbs-api.service ~/.config/systemd/user/
systemctl --user daemon-reload && systemctl --user enable --now pbs-api
journalctl --user -u pbs-api -f      # logs
```

The API listens only on `127.0.0.1:8787`; Funnel forwards public HTTPS traffic to it.

## 2. Open it with Tailscale Funnel

The tailnet admin allows Funnel once (admin console: Access controls → `funnel` node attribute,
and HTTPS certificates on). Then on the server:

```bash
sudo tailscale funnel --bg 8787
tailscale funnel status      # shows the public https://….ts.net address
```

Check from any computer: `curl https://<address>/api/health` → `{"ok":true}`.

## 3. Point the site to the API

Put the address in `.env.production` in the repo root and push to `main`:

```
VITE_API_URL=https://<machine>.<tailnet>.ts.net
```

The next GitHub Pages build uses the server. Without this file the site runs in browser-only mode.

## Admin commands

```bash
npm run server:seed                 # reload generated demo data; testers' data stays
npm run server:team -- email password [First] [Last]
npm run server:testers -- delete    # delete all testers' accounts, photographers and bookings
```

## Notes

- Who can do what: anyone can search and see profiles; booking needs an account; a photographer edits
  only their own rules and profile; team accounts can open and edit every photographer (role switch).
- Client contact details are returned only to that client, the photographer and the team.
- The booking check and the insert run in one transaction, so two people cannot take the same time.
- Backups: copy `server/data/pbs.sqlite` (for example, a daily cron with `sqlite3 pbs.sqlite ".backup …"`).
