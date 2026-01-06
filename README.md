
# ⚽ Gemini Football Manager '27

Gemini Football Manager '27 is a next-generation text-simulation game where match reports, negotiations, interviews, and world events are generated dynamically using Google’s Gemini API.

Instead of fixed commentary and rigid decision trees, every season produces unique scenarios and outcomes based on tactics, club prestige, player personalities, and international events.

## 🚀 The Leap from "Text Sim" to "Video Game"

We are transforming the experience with three major new modules:

1.  **The 2D Match Engine (`PitchView.tsx`):**
    *   **Visuals:** Replaces the static momentum bar with a live visual representation of the match.
    *   **Logic:** Uses `momentum` state to drive the "average position" of the team. If you are dominating, your dots press high. If parking the bus, they sit deep.
    *   **Events:** When a goal is scored, the visualizer triggers a specific animation sequence.

2.  **The Gemini Scout (`ScoutingScreen.tsx`):**
    *   **Conversational Interface:** You don't filter by "Pace > 15". You say: *"Find me a young Brazilian striker who is good at finishing."*
    *   **AI Generation:** Gemini generates unique player profiles based on your natural language request.

3.  **Dynamic Press Conferences:**
    *   **Context Aware:** After matches, the press will grill you based on the specific result and match events.

## 🌟 What Makes It Different?

Traditional football managers simulate numbers and wrap results in canned text. GFM '27 flips that: the narrative engine is part of the simulation.

*   **🗣️ Conversational Negotiations:** Agents ask specific, multi-part questions about playing time and wages. You must persuade them based on their client's personality.
*   **👔 Dynamic Interviews:** Board interviews evaluate your specific answers. A "Moneyball" owner wants different answers than a "Tycoon."
*   **🌍 Narrative Match Engine:** The AI understands context. A 90th-minute winner in the World Cup Final generates different commentary than a pre-season friendly.
*   **💢 Chemistry Rifts:** International teammates who knock each other out of tournaments can return to your club with "Bad Chemistry," affecting performance for weeks.

## 🏆 Game Modes

### 1. Club Career (Integrated)
*   **7 Leagues:** Premier League, Championship, La Liga, Serie A, Bundesliga, Ligue 1, MLS.
*   **Champions League:** Fully integrated 36-team Swiss Model format. Top teams compete in Europe mid-week while fighting for the domestic title on weekends.
*   **Full Management:** Manage a full season, handle transfers, scouting, and hit board expectations.

### 2. Zero to Hero (Unemployed Start)
*   **RPG Character Creation:** Define your background (Sunday League Amateur → World Class Legend).
*   **Prestige System:** Your background dictates which clubs will even grant you an interview.
*   **Job Centre:** A live board of vacancies that updates as the simulation progresses.

### 3. World Cup 2026 Prologue
*   **Authentic Format:** 48 teams, 12 groups (A–L).
*   **Complex Qualification:** Top 2 advance + 8 best 3rd-place teams.
*   **High Stakes:** Winning grants "Legend" status, allowing you to walk into elite club jobs in the main season.

## 🕹️ Gameplay Loop

*   **Tactical Setup:** Choose formations (4-3-3, Park the Bus, etc.) and mentality.
*   **Match Simulation:** Watch the first half simulation with live tactical updates.
*   **Touchline Shouts:** Deliver a half-time talk (e.g., "Demand More") that actually influences the AI's second-half simulation.
*   **Full Time:** Read the dynamic match report, face the press, and see how the league table updates.
*   **Man Management:** Deal with contract renewals, transfer negotiations, and morale issues during the week.

## 🛠️ Tech Stack

*   **Frontend:** React 19 + TypeScript
*   **Styling:** Tailwind CSS
*   **AI Backend:** Google Gemini API (@google/genai)
*   **State Management:** Complex React Hooks for tournament trees and league tables.

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
    (Note: You can get a key from Google AI Studio)

3.  **Run the App**
    ```bash
    npm run dev
    ```

## 🗺️ Roadmap

*   Persistent Manager Reputation Arc (Press & Fan Sentiment)
*   Save/Load Season Functionality
*   Youth Academy Generation
