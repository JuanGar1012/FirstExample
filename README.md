# FirstExample - Portfolio To-Do App

A polished React + TypeScript to-do app built with Vite and Tailwind CSS.

Live app: `https://first-codex-example-todo-app.vercel.app/`

## Features

- Add, complete, and delete tasks
- Deterministic ordering (newest first)
- Blue modern UI theme
- Firework animation when completing tasks
- Throw-to-trash animation when deleting tasks
- Menu views:
  - `Board`
  - `Completed Log`
  - `Insights`
  - `Activity`
- Username-only login (no password)
- Per-user local task workspaces in the browser
- Local persistence with corruption-safe parsing

## Username-Only Mode

- Users enter a username to access the app.
- No password/auth backend is used.
- Data is isolated per username via localStorage namespace:
  - `todoapp:v1:<normalized-username>`
- Current active username is stored in:
  - `todoapp:user:v1`

Important: This is client-side only and not secure authentication. It is intended for portfolio/demo behavior.

## Local Development

Requirements:
- Node.js 18+
- npm

Install and run:

```bash
npm install
npm run dev
```

App runs on:
- `http://localhost:8000`

Production build:

```bash
npm run build
```

## Deployment (Vercel)

This project is configured for Vercel + Vite.

### Do changes update production automatically?

- `Yes`, if your Vercel project is connected to this GitHub repo and you push to the configured production branch (usually `main`).
- `No`, for local-only edits that are not pushed to GitHub.

Typical flow:
1. Commit local changes
2. Push to GitHub (`main`)
3. Vercel auto-builds and deploys
4. New version appears on your live URL

## Scripts

- `npm run dev` - start dev server on port 8000
- `npm run build` - type-check and build for production
- `npm run preview` - preview production build on port 8000

## Notes

- `npm run test` is not configured.
- `npm run lint` is not configured.