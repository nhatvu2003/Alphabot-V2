# Alphabot V2

Professional Facebook bot framework optimized for Termux, with a simple web UI and modular command system.

> Note: This project is optimized and supported primarily on Termux (Android) and Linux. Windows is best-effort for code updates only.

## Requirements

- Node.js >= 22.20.0 (as configured in `package.json`)
- Git (for updates)
- Termux (Android) or a Linux environment recommended

## Quick Start

### Termux (recommended)

```bash
# 1) Install prerequisites (Termux)
pkg update -y && pkg upgrade -y
pkg install -y nodejs git

# 2) Clone & install
git clone https://github.com/nhatvu2003/Alphabot-V2.git
cd Alphabot-V2
npm install

# 3) Configure environment
cp .env.example .env
# Edit .env to set WEB_PORT, MONGO_URL, etc.

# 4) Start Web UI and update appstate
npm run ui
# Open browser on the device: <http://localhost:8080>
# Update appstate via UI; the bot can auto-start after update.
```

Or run the guided setup script on Termux:

```bash
bash setup-termux.sh
```

### Linux / macOS

```bash
# Clone repo
git clone https://github.com/nhatvu2003/Alphabot-V2.git
cd Alphabot-V2

# Install deps
npm install

# Configure and run UI
cp .env.example .env
npm run ui
```

### Windows (best-effort)

- You can update code with the updater, but dependency installation is not supported by the automated updater on Windows.
- Use WSL or a Linux host if possible for full support.

```powershell
# In PowerShell (code update only)
cd D:\Alphabot
npm run update
# If you need to install packages, run npm install manually (experimental on Windows)
```

## Environment Variables

Copy `.env.example` to `.env` and edit as needed:

- `PORT` – Internal server port (for internal services)
- `WEB_PORT` – Web UI port (default 8080)
- `WEB_HOST` – Web UI host (default localhost)
- `WEB_ENABLED` – Toggle web UI (true/false)
- `IMGBB_KEY` – Optional image hosting key
- `MONGO_URL` – MongoDB connection string (optional)
- `APPSTATE_SECRET_KEY` – Optional encryption key for appstate
- `AUTO_START_BOT` – Auto start bot after updating appstate via UI
- `API_KEY` – Optional API key if used by plugins
- `DEFAULT_LANG` – Default language (e.g., vi)

## Scripts

- `npm start` — Start the main entry (`index.js`) which initializes the bot environment
- `npm run bot` — Start core bot (`src/core/Gbot.js`)
- `npm run ui` — Start the Web UI used to update appstate and optionally auto-start the bot
- `npm run cleanup` — Run cleanup script
- `npm run update` — Update code and install packages where supported (see Updater below)
- `npm run update:dry` — Dry-run updater (no changes executed)

## Update flow (Updater)

We provide `update.js` to keep your code up to date.

Usage:

```bash
# Linux/Termux
node update.js [--dry-run] [--skip-install] [--force-install]

# Or with npm scripts
npm run update          # normal update (Windows: code-only)
npm run update:dry     # show what would run without executing
```

Flags:

- `--dry-run` — Simulate actions (print commands, don’t execute)
- `--skip-install` — Skip `npm install`/`npm ci`
- `--force-install` — Force install even if running on Windows (not officially supported)

Behavior by platform:

- Termux/Linux: pulls latest changes (if in a Git repo) and installs dependencies (`npm ci` if `package-lock.json` exists, else `npm install`).
- Windows: by default, updater pulls code only and skips dependency installation. Use `--force-install` if you know what you’re doing.

## Folder Structure (high level)

```text
Alphabot-V2/
├─ assets/
├─ config/
│  ├─ config.main.json
│  └─ config.plugins.json
├─ data/
│  ├─ admins.json, appstate.json, ...
│  └─ user-data/
├─ logs/
├─ public/
│  └─ index.html (Web UI)
├─ scripts/
│  ├─ update-appstate.js (Web UI server)
│  └─ cleanup.js
├─ src/
│  ├─ commands/ (modular command files)
│  ├─ core/ (bot core, services, helpers)
│  ├─ custom/ (custom handlers/events)
│  └─ utils/
├─ index.js (app initializer)
├─ update.js (updater)
└─ setup-termux.sh (Termux setup helper)
```

## Common Tasks

- Start Web UI (update appstate):
  - Termux/Linux: `npm run ui` then open <http://localhost:8080>
- Run bot directly:
  - `npm run bot`
- Update to latest code:
  - `npm run update`

## Troubleshooting

- Web UI won’t start on Termux:
  - Ensure Node.js is installed via Termux packages: `pkg install nodejs`
  - Check that `WEB_PORT` is not in use
- Bot won’t log in:
  - Make sure `data/appstate.json` has valid session data (update via Web UI)
- Update on Windows didn’t install packages:
  - This is expected. Use WSL or Linux/Termux for full support, or try `npm install` manually on Windows.

## Contributing

PRs and issues are welcome. See `CHANGES_SUMMARY.md` for a summary of recent changes.

## License

MIT © Nhat Vu & Contributors
