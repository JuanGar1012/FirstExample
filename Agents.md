# AGENTS.md - React To-Do App (Current Project State)

## Project goal
Build a polished React + TypeScript To-Do app with deterministic behavior, strong UX, and local persistence.

## Current implementation status (as of Feb 11, 2026)
- Runtime: Vite + React + TypeScript
- Styling: Tailwind CSS + custom CSS animations
- Local run: `npm run dev` serves on port `8000`
- Persistence: `localStorage` key `todoapp:v1`

### Implemented app features
- Add todo with input trim validation and Enter-submit
- Toggle complete/incomplete
- Delete todo
- Deterministic ordering (newest first by `createdAt`, tie-break by `id`)
- Firework animation when marking task `Done`
- Throw-to-trash animation when deleting
- Blue visual theme and modern UI polish
- Menu views:
  - `Board`
  - `Completed Log` (timestamped completion history)
  - `Insights` (completion metrics)
  - `Activity` (added/completed/reopened/deleted timeline)

### Data model currently in code
`Todo` includes:
- `id: string`
- `title: string`
- `completed: boolean`
- `createdAt: number`
- `completedAt: number | null`

Extra persisted records:
- `completedLog` entries with completion timestamps
- `activity` entries for timeline events

## Quality checks
- `npm run build` passes
- `npm run test` not configured
- `npm run lint` not configured

## Deployment status
Not deployed yet.

### Blockers remaining
- No GitHub remote configured (`git remote -v` is empty)
- Local changes are not fully committed

### Next steps to deploy on Vercel (Option 1)
1. Create a GitHub repository.
2. Push this local project:
   - `git add .`
   - `git commit -m "Prepare portfolio todo app for deployment"`
   - `git branch -M main`
   - `git remote add origin <your-github-repo-url>`
   - `git push -u origin main`
3. In Vercel, import the GitHub repo and deploy with:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`

## Planned next feature after deployment
Username-only login mode (no password), scoped per browser session/local storage namespace.

### Practical direction
- Add a lightweight login screen requiring a non-empty username.
- Store current user locally (e.g., `todoapp:user:v1`).
- Scope task data by username (e.g., `todoapp:v1:<username>`), so users only see their own tasks on a shared device/browser.
- Keep this explicitly non-secure and demo/portfolio-oriented.