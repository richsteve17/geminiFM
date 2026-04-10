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

## Chemistry Rift & International Bond System (Task #2)

### New Types (`src/types.ts`)
- `RiftSeverity`: `'none' | 'minor' | 'moderate' | 'serious'`
- `RiftScope`: `'direct' | 'nation-wide'`
- `PlayerEffect` extended with `InternationalRift` and `TeammateBond` variants
- `NewsItem` extended with `serious-rift` and `teammate-bond` types
- `RiftDecisionChoice` interface for manager bench/risk decisions

### New AI Functions (`src/services/geminiService.ts`)
- `getTeammateTournamentRivalry()` — returns rift severity, duration, reason, and scope using the full personality multiplier matrix
- `getPlayerPostTournamentMorale()` — returns personality-weighted morale effect for returning players

### International Break Processing (`src/App.tsx`)
- `processInternationalBreak()` — called every international break week; groups squad by nationality, simulates rivalries and bonds
- **Teammate Bonds**: same-nationality players who went deep apply `TeammateBond` effect to each other
- **Rifts**: cross-nationality pairs get `InternationalRift` effects with severity/duration from AI
- **Nation-wide scope**: Mercenary-type rifts apply to all players of the rival nationality in the squad
- **Serious Rift events**: fire `serious-rift` news with bench A / bench B / risk-it decision buttons
- **Effects decay**: all player effects decrement `until` counter each week and expire at 0

### Match Integration
- Rift pairs and bond pairs injected into `simulateMatchSegment` context for Miscommunication/chemistry commentary

### Transfer Integration
- `getPlayerTalkQuestions` and `evaluatePlayerTalk` accept optional `bondContext` to reference international connections and lower wage demands

### UI Updates
- `TeamDetails.tsx`: shows 🤝 for bonds, colored broken link icons for rift severity levels
- `NewsScreen.tsx`: styled rift/bond news cards with decision buttons for serious rifts
