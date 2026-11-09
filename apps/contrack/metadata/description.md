# Contrack

Self-hosted personal CRM with local semantic search.

Contrack is an open-source (AGPL-3.0) personal CRM that runs as a single Node.js
process backed by one SQLite database on your server. There is no external
database container to maintain, and built-in semantic search runs offline on
local models bundled inside the image.

## Features

- **Import and sync**: Import contacts from Apple Contacts, Google Contacts,
  LinkedIn, Facebook, CSV, or vCard, and connect Google Workspace, CardDAV, ICS
  calendars, or IMAP mailboxes so meetings and emails appear on each person's
  timeline.
- **Deduplicate with undo**: Merge obvious duplicate contacts automatically and
  review borderline matches side by side, with a 90-day undo history.
- **Daily Pulse and reminders**: Log notes in plain language, set stay-in-touch
  cadences, and review upcoming follow-ups, birthdays, anniversaries, and custom
  milestones on the Pulse briefing or an interactive map.
- **Local semantic search (Ask Contrack)**: Search across contacts, notes, and
  interactions by meaning without sending data to an external API.
- **Optional AI and MCP**: Connect Gemini, OpenAI, Anthropic, or an
  OpenAI-compatible endpoint such as Ollama for note enrichment and web
  research, or lock external AI off completely with the install toggle. Connect
  Claude, Cursor, or other MCP clients with personal API tokens.
- **Multi-user and verified backups**: Host isolated address books for family or
  team members on one instance, with scheduled integrity-checked SQLite
  snapshots.

## First login

Sign-in is enabled (`AUTH_REQUIRED=true`). Open Contrack after installing to
create the initial administrator account on your first visit.

`PUBLIC_URL` and `TRUST_PROXY_HOPS=1` are wired to Runtipi's domain settings
automatically, whether you expose Contrack on a custom HTTPS domain through
Runtipi's reverse proxy, use your Runtipi local domain, or open port `3210` on
your LAN. Local `.local`, `.lan`, and Tailscale `.ts.net` hostnames are allowed
out of the box; if you open Contrack on another custom hostname before creating
the first account, pass it in **Extra allowed hostnames** during install.

## Data and backups

All persistent state lives in `${APP_DATA_DIR}/data` (mounted at `/app/data`
inside the container), including:

- `curator.db` — the SQLite database
- `secret.key` — generated automatically on first boot to encrypt stored
  connector credentials; keep it alongside `curator.db` when backing up
- uploaded avatars, attachments, and verified database backups

## Links

- Source and documentation: <https://github.com/arvarik/contrack>
- Self-hosting guide: <https://github.com/arvarik/contrack/blob/main/docs/self-hosting.md>
- Issue tracker: <https://github.com/arvarik/contrack/issues>
