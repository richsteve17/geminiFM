
# ⚽ Gemini Football Manager '27

![Gemini API](https://img.shields.io/badge/AI-Gemini%20API-8E75B2?style=for-the-badge)
![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript)

**Gemini Football Manager '27** is a next-generation text-simulation game where match reports, negotiations, interviews, and world events are generated dynamically using Google’s Gemini API.

Instead of fixed commentary and rigid decision trees, every season produces unique scenarios and outcomes based on tactics, club prestige, player personalities, and international events.

---

## 🚀 What Makes It Different?

Traditional football managers simulate numbers and wrap results in canned text. **GFM '27** flips that: the narrative engine *is* part of the simulation.

*   **🗣️ Conversational Negotiations:** Agents ask specific, multi-part questions about playing time and wages. You must persuade them based on their client's personality.
*   **👔 Dynamic Interviews:** Board interviews evaluate your specific answers. A "Moneyball" owner wants different answers than a "Tycoon."
*   **🌍 Narrative Match Engine:** The AI understands context. A 90th-minute winner in the World Cup Final generates different commentary than a pre-season friendly.
*   **💢 Chemistry Rifts:** International teammates who knock each other out of tournaments can return to your club with "Bad Chemistry," affecting performance for weeks.

---

## 🏆 Game Modes

### 1. Club Career (Standard)
*   **7 Leagues:** Premier League, Championship, La Liga, Serie A, Bundesliga, Ligue 1, MLS.
*   **Full Management:** Manage a full season, handle transfers, and hit board expectations.

### 2. Zero to Hero (Unemployed Start)
*   **RPG Character Creation:** Define your background (Sunday League Amateur → World Class Legend).
*   **Prestige System:** Your background dictates which clubs will even grant you an interview.
*   **Job Centre:** A live board of vacancies that updates as the simulation progresses.

### 3. World Cup 2026 Prologue (New)
*   **Authentic Format:** 48 teams, 12 groups (A–L).
*   **Complex Qualification:** Top 2 advance + 8 best 3rd-place teams.
*   **High Stakes:** Winning grants "Legend" status, allowing you to walk into elite club jobs in the main season.

---

## 🕹️ Gameplay Loop

1.  **Tactical Setup:** Choose formations (4-3-3, Park the Bus, etc.) and mentality.
2.  **Match Simulation:** Watch the first half simulation.
3.  **Touchline Shouts:** Deliver a half-time talk (e.g., "Demand More") that actually influences the AI's second-half simulation.
4.  **Full Time:** Read the dynamic match report and see how the league table updates.
5.  **Man Management:** Deal with contract renewals, transfers, and morale issues during the week.

---

## 🛠️ Tech Stack

*   **Frontend:** React 19 + TypeScript
*   **Styling:** Tailwind CSS
*   **AI Backend:** Google Gemini API (`@google/genai`)
*   **State Management:** Complex React Hooks for tournament trees and league tables.

---

## 💻 Local Development

If you are cloning this repo to run locally:

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Set up Environment Variables**
    Create a `.env` file in the root directory:
    ```env
    VITE_GEMINI_API_KEY=your_api_key_here
    ```
    *(Note: You can get a key from [Google AI Studio](https://aistudio.google.com/))*

3.  **Run the App**
    ```bash
    npm run dev
    ```

---

## 🗺️ Roadmap

*   [ ] Champions League / Continental Competitions
*   [ ] Persistent Manager Reputation Arc (Press & Fan Sentiment)
*   [ ] Save/Load Season Functionality
*   [ ] Youth Academy Generation

---

**License:** MIT
