
# ⚽ Gemini Football Manager '27
**The World's First LLM-Driven Sports Simulation**

Gemini Football Manager '27 redefines the sports strategy genre by replacing rigid decision trees with a Generative AI engine. Every match, interview, and negotiation is unique, context-aware, and driven by Google's Gemini API.

> **Current Build:** v1.5 (Roster Update & Stability Patch)
> **Engine:** React 19 + TypeScript + Google GenAI SDK

## 🚀 Quick Start

1.  **Clone the repository**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Configure API Key:**
    Create a `.env` file in the root directory:
    ```env
    VITE_GEMINI_API_KEY=your_google_ai_studio_key
    ```
4.  **Kick Off:**
    ```bash
    npm run dev
    ```

---

## 🎮 Game Modes

### 1. 🏆 Club Career (The Core Experience)
Take charge of a club in one of the world's top 7 leagues.
*   **Leagues:** Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Championship, MLS.
*   **Champions League:** Fully simulated 36-team Swiss Model tournament integrated into the season.
*   **Goal:** Balance board expectations, finances, and tactical evolutions to build a dynasty.

### 2. 🌍 World Cup 2026 (Prologue)
A standalone tournament mode featuring the expanded 48-team format.
*   **High Stakes:** Lead a nation to glory. Winning boosts your manager reputation significantly for future saves.
*   **Authentic Groups:** 12 Groups (A-L) with realistic seeding.
*   **Rosters:** 2026-projected squads for major nations (France, Brazil, England, etc.).

### 3. 💼 Road to Glory (Unemployed)
Start from the bottom with a custom manager profile.
*   **RPG Elements:** Choose your background (Sunday League vs Legend).
*   **Job Hunt:** Apply for vacancies via the dynamic Job Centre.
*   **Interviews:** Face grilling questions from chairmen with different personalities (Tycoon vs Traditionalist).

---

## 🧠 The "Gemini" Difference

Unlike traditional managers, GFM '27 uses AI to generate logic, not just text.

*   **Hawk-Eye Validation:** A deterministic layer ensures the AI adheres to the laws of physics and football (e.g., a player cannot score if they aren't on the pitch).
*   **Narrative Engine:** The commentary adapts to the stakes. A 90th-minute winner in a derby feels different than a friendly.
*   **Natural Language Scouting:** Don't filter by stats. Tell your scout: *"Find me a cheap replacement for Salah who is fast and left-footed."*

## 🛠️ Tech Stack

*   **Frontend:** React 19, TypeScript, Vite
*   **Styling:** Tailwind CSS
*   **AI:** @google/genai (Gemini 2.5/3.0 Models)
*   **State:** Complex React Hooks & Context-free State Management
*   **Icons:** Heroicons (SVG)

## 📝 License

MIT License. Created as an experimental showcase of LLM capabilities in complex simulation environments.
