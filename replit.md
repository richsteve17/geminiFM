# Gemini Football Manager '27

An AI-powered football management simulation game built with React + Vite and Google Gemini AI.

## Project Overview

Players take on the role of a football manager. The game uses AI (Google Gemini) to generate match narratives, conduct free-form chat-based job interviews, simulate context-aware press conferences, and provide scouting data. Contract crisis opening events fire when a career begins with expiring player contracts.

## Tech Stack

- **Language:** TypeScript / TSX
- **Framework:** React 19
- **Build Tool:** Vite 6
- **Package Manager:** npm
- **Styling:** Tailwind CSS (via CDN)
- **AI:** Google Gemini API (`@google/genai`)

## Project Layout

- `/` — Root config files (`vite.config.ts`, `package.json`, `tsconfig.json`), entry points (`index.html`, `index.tsx`), and shared logic (`constants.ts`, `types.ts`, `utils.ts`, `europe.ts`, `international.ts`)
- `src/` — Main app code (`App.tsx`) and mirrored logic files
- `src/components/` — React UI components
- `components/` — Additional components (legacy/root-level)
- `services/` — AI service layer (`geminiService.ts`) and utilities
- `docs/` — Design and economics documentation

## Environment Variables

- `VITE_GEMINI_API_KEY` — Google Gemini API key (required for AI features)
- Also accepts `GEMINI_API_KEY` (mapped in vite config)

## Running Locally

```bash
npm install
npm run dev
```

The dev server runs on port 5000 at `http://0.0.0.0:5000`.

## Building for Production

```bash
npm run build
```

Output goes to `dist/`.

## Key Features

- **World Cup Mode:** 48-team tournament with 12 groups (Group Stage → Round of 32 → R16 → QF → SF → Final)
- **Reputation Gate System:** World Cup performance determines starting reputation and club tier availability in Club Career/Road to Glory modes
- **Knockout Bracket View:** Visible in the League Table panel during World Cup knockout rounds
- **World Cup Result Screen:** Summary screen after elimination/win showing reputation tier earned and available clubs
- The `worldCupResult` is persisted to `localStorage` and read when starting Club Career or Road to Glory

## Deployment

Deployed as a static site. Build command: `npm run build`. Public directory: `dist`.
