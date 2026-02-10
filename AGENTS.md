# Repository Guidelines

## Project Structure & Module Organization
`index.html` loads Tailwind via CDN and bootstraps the app with `index.tsx`.
Primary source lives in `src/`, with the main UI in `src/App.tsx` and screens in `src/components/`.
Domain data and helpers are grouped in `src/constants.ts`, `src/types.ts`, and `src/utils.ts`.
AI integrations live under `src/services/` (Gemini + media generation).

## Build, Test, and Development Commands
- `npm run dev`: Start the Vite dev server for local development.
- `npm run build`: Produce a production build in `dist/`.
- `npm run preview`: Serve the production build locally.

## Coding Style & Naming Conventions
- TypeScript + React (TSX) with ES modules.
- Indentation is 4 spaces; keep files consistent.
- Components use `PascalCase` (`TeamDetails.tsx`), functions/variables use `camelCase`,
  and constants use `UPPER_SNAKE_CASE`.
- Tailwind utility classes are applied directly in JSX; keep class strings readable.

## Testing Guidelines
Automated tests are not configured in this repo yet. If you add tests, keep them close to
the feature (e.g., `src/components/__tests__/`) and document new test commands in
`package.json`.

## Commit & Pull Request Guidelines
Commit history follows Conventional Commits (e.g., `feat(match): ...`, `fix(TeamDetails): ...`).
When opening a PR, include:
- A short summary and testing notes (`npm run dev`, `npm run build`).
- Screenshots or clips for UI changes.
- Any relevant issue or feature link.

## Configuration & Secrets
Create a `.env` file with `VITE_GEMINI_API_KEY=...` for AI features. Keep secrets out of
git and prefer local environment files.