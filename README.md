# Papertrail

A complete local document workspace with persistent rich-text editing, file imports, and sharing. Built with Next.js App Router, React, TypeScript, Tailwind CSS, Tiptap, Prisma 7, SQLite, Zod, and Lucide React.

## Setup

Prerequisites: Node.js 24 LTS and npm. SQLite runs locally through `better-sqlite3`; no database service is required. If a native binary is unavailable, installation requires Python and a C/C++ compiler.

```sh
npm install
cp .env.example .env
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open http://localhost:3000. Installation generates Prisma Client automatically. If your npm policy blocks dependency installation scripts, allow the required `better-sqlite3` and Prisma engine scripts and run `npx prisma generate` after installation.

The seed is idempotent and does not reset documents. To regenerate the client manually, run `npx prisma generate`. After changing the schema, create a migration with `npx prisma migrate dev --name your_change`.

Production:

```sh
npm run build
npm start
```

The production build uses Next.js's supported webpack option and Tailwind's PostCSS integration. The development server uses Turbopack.

## Features

- Create, rename, reopen, search, and delete owned documents with confirmation.
- Separate My Documents and Shared With Me sections, with owner and modification dates.
- Tiptap JSON persistence: paragraphs, H1–H3, bold, italic, underline, bullets, numbered lists, undo, and redo. Standard editing shortcuts and Ctrl/Cmd+S are supported.
- Autosave after one second of inactivity, manual save, visible progress and errors. Save operations are serialized, and new edits during a save remain dirty.
- Explicit back navigation flushes edits. Tab hiding also attempts a save, and closing or refreshing with pending edits triggers the browser's unsaved-change warning.
- Version-based optimistic concurrency rejects stale updates with HTTP 409. Edits remain in the editor; download a JSON draft before reloading the latest version.
- Import `.txt` and `.md` files, maximum **2 MB**. Plain text retains paragraphs and line breaks; Markdown supports headings, bold, italic, nested lists, block quotes, and code blocks. Raw HTML is treated as text; no imported HTML is executed.
- Share with demo users and revoke access. All permission rules are enforced on the server, including direct API requests.

## Demo accounts and sessions

| Name    | Email               |
| ------- | ------------------- |
| Alice   | alice@example.com   |
| Bob     | bob@example.com     |
| Charlie | charlie@example.com |

Alice is the default account. The dashboard header lets you select another account. The server validates the selected user and sets a 30-day HTTP-only, SameSite=Lax cookie (`Secure` in production). Subsequent requests resolve identity through this cookie and a database lookup; document writes never accept a client-supplied owner as identity.

**This is simulated authentication for a local demonstration, not production authentication.** Anyone with access to the demo can deliberately switch to any seeded user. There is no password or security boundary between demo identities. Invalid session cookies are rejected.

## Permissions

| Action                     | Owner | Shared editor | Unrelated user |
| -------------------------- | ----- | ------------- | -------------- |
| Read / edit content / save | Yes   | Yes           | No             |
| Rename / delete            | Yes   | No            | No             |
| View and manage sharing    | Yes   | No            | No             |

Revocation takes effect on subsequent server requests. A previously open editor may still show content already loaded in memory, but cannot save or fetch the document again.

## Database and persistence

`DATABASE_URL` defaults to `file:./prisma/dev.db`, relative to the project root. Use the same URL for both Prisma CLI and the application. `.env.example` supplies this setting. SQLite data persists across browser refreshes and application restarts. The Prisma config creates an empty SQLite file and parent directory when needed before applying migrations. The database and environment file are ignored by Git; migrations are committed. Back up the database file to preserve documents.

- `User`: ID, unique email, name, creation timestamp; owns documents and receives shares.
- `Document`: ID, title, JSON serialized as text, owner relation, creation/update timestamps, integer version.
- `DocumentShare`: ID, document relation, recipient relation, creation timestamp. A unique `(documentId, userId)` constraint prevents duplicate shares. Deleting a document cascades to its shares.

## Architecture and API

- `app/dashboard` and `app/documents/[id]`: server-rendered pages and database reads.
- `components/`: interactive dashboard, session selector, Tiptap editor, and sharing modal.
- `lib/`: database client, identity, authorization, API error handling, Zod schemas, and safe Markdown conversion.
- `prisma/`: schema, initial migration, and idempotent demo seed.
- `tests/`: structured-content/import validation and HTTP lifecycle integration tests.

Route Handlers provide:

```text
GET, POST       /api/documents
GET, PATCH, DELETE /api/documents/:id
GET, POST       /api/documents/:id/shares
DELETE          /api/documents/:id/shares/:userId
POST            /api/documents/import
GET             /api/users
POST            /api/demo-session
```

Document updates require `version` and either `title` or `content`. Content accepts only validated supported Tiptap nodes and marks. Content writes and version increments execute in a transaction. Mutation handlers reject cross-origin requests when an Origin header is supplied. Errors return meaningful 400, 401, 403, 404, 409, 413, and 500 responses without internal database details.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` runs six unit tests by default. To also run the HTTP lifecycle test, start the application in another terminal, then run:

```sh
TEST_BASE_URL=http://localhost:3000 npm test
```

The API test creates and cleans up its own documents and checks creation, persistence, content formatting, unrelated/invalid users, sharing, duplicate shares, shared-editor restrictions, stale-save conflicts, access revocation, Markdown import, unsupported imports, and deletion. Run against a local test instance, not a public deployment. A Playwright browser test verifies create, rename, formatting, autosave, refresh persistence, sharing, account switching, shared editing, revocation, and Markdown import. With the application running:

```sh
npx playwright install chromium
npm run test:browser
```

To use an existing Chromium-based browser instead:

```sh
BROWSER_PATH=/path/to/chromium npm run test:browser
```

Set `TEST_BASE_URL` for a different local port. The browser test also cleans up its documents.

## Limitations and production considerations

- No realtime collaboration. Conflicts require preserving your draft and reloading the latest document. Draft downloads are JSON recovery artifacts, not an import format.
- A failed save keeps changes in memory; drafts are not stored durably offline. Download the draft before closing after an error. Abrupt browser or process termination cannot guarantee a final save.
- Markdown links/images/tables and arbitrary HTML are not rendered as active rich content. DOCX is not supported.
- A document is editable by any authorized shared editor, but the title remains owner-only.
- For production, replace the demo switcher with authenticated sessions, add request rate/body limits at the proxy, configure TLS and backups, and consider PostgreSQL for multi-instance deployments. Local SQLite requires a persistent writable filesystem and is unsuitable for ephemeral serverless storage.
- The sharing modal supports Escape and an initial close-button focus; it does not implement a full focus trap.
