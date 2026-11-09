# Contrack App Store for Runtipi

[![Test](https://github.com/arvarik/runtipi-appstore/actions/workflows/test.yml/badge.svg)](https://github.com/arvarik/runtipi-appstore/actions/workflows/test.yml)

Official [Runtipi](https://runtipi.io) custom app store for [Contrack](https://github.com/arvarik/contrack), an open-source (AGPL-3.0) self-hosted personal CRM with offline local semantic search.

## Add to Runtipi

1. Open your Runtipi dashboard and go to **Settings → App Stores**.
2. Click **Add App Store**.
3. Paste this repository URL and give the store a name:

```text
https://github.com/arvarik/runtipi-appstore
```

Contrack then appears in the Runtipi App Store and installs and updates like any built-in app. Requires **Runtipi v4.5.0 or newer**.

## Install details

| Setting | Value |
| --- | --- |
| Image | `ghcr.io/arvarik/contrack:2.0.6` (`amd64` and `arm64`) |
| Container / default host port | `3210` |
| Database & search | Single SQLite file + bundled local ONNX models (no external DB or API needed) |
| Data directory | `${APP_DATA_DIR}/data` mounted at `/app/data` |
| Authentication | `AUTH_REQUIRED=true` — first visit creates the admin account |

### First-visit setup

Open Contrack after installation finishes to create the administrator account. Runtipi's domain and proxy variables (`APP_PROTOCOL`, `APP_DOMAIN`, `LOCAL_DOMAIN`, `APP_LOCAL_DOMAIN`) are wired into `PUBLIC_URL`, `TRUST_PROXY_HOPS=1`, and `ALLOWED_HOSTS`, so Contrack works whether exposed through Runtipi's reverse proxy over HTTPS or opened directly on your LAN or Tailscale (`.ts.net`).

### Persistent data

All state is stored inside `${APP_DATA_DIR}/data`:

- `curator.db` (SQLite database)
- `secret.key` (auto-generated on first boot to encrypt connector credentials; back this up together with `curator.db`)
- uploaded avatars, attachments, and scheduled verified backups

Because Contrack runs as non-root `node` (`1000:1000`), a short-lived `contrack-init` service runs `chown -R 1000:1000 /app/data` before the main container starts so Docker bind-mount permissions work out of the box.

## Runtipi compatibility (`v4.5.0+`)

Each app ships both `docker-compose.yml` (`x-runtipi` schema v2, read by Runtipi `4.7.0+`) and `docker-compose.json` (dynamic compose schema v2, read by Runtipi `4.5.0–4.6.x`). The test suite verifies that both files pass `@runtipi/common` schema validation, convert to identical service definitions, and pin the exact image version from `config.json`.

## Local verification

```bash
bun install
bun test
APP_DATA_DIR=/tmp/runtipi-appdata docker compose -f apps/contrack/docker-compose.yml config -q
```
