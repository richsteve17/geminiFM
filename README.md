
# ⚽ Gemini Football Manager '27

![Gemini API](https://img.shields.io/badge/AI-Gemini%20API-8E75B2?style=for-the-badge)
![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=for-the-badge&logo=react)

**Gemini Football Manager ’27** is an RPG football sim where the match engine *is* the story engine. 

Forget canned commentary. Every result, every board interaction, and every contract negotiation is a unique narrative outcome powered by the context-aware reasoning of Google’s Gemini API.

**[🚀 Play the Alpha Demo Here](https://github.com/your-repo-link)**

---

## 🚀 The Narrative Engine

Standard managers wrap numbers in fixed text. **GFM '27** uses Gemini to transform tactical choices into tangible story arcs:

*   **👔 Tactical Consequences:** Switching to 'Park the Bus' in the 80th minute against Madrid doesn't just change a slider—it forces the AI to simulate a desperate defensive stand where every tackle is weighed against player personality and momentum.
*   **🗣️ Agent Diplomacy:** Negotiate in natural language. An *Ambitious* player cares about your Champions League status; a *Mercenary* only cares if you can meet his wage demands. 
*   **💢 Teammate Rivalries:** Teammates who clash in the World Cup return to your club with "Bad Chemistry" effects, forcing you to manage locker room tension or sell a star.
*   **🧠 Natural Language Scouting:** Ask your scout for "a gritty, veteran Italian defender to shore up a leaky backline" and receive AI-generated player profiles that actually fit the mold.

---

## 🏆 Game Modes

### 1. Integrated Club Career
Manage a top-tier club across a congested calendar. Dominate your domestic league on weekends and navigate the new **36-team Swiss Model Champions League** mid-week. Success in Europe brings prestige; failure brings the sack.

### 2. World Cup Prologue
Start your journey in the Summer of '26. Lead a nation through the massive 48-team tournament. Your performance here dictates your "Manager Reputation," determining which club jobs are open to you when the domestic season kicks off.

### 3. Unemployed (Zero to Hero)
Create your persona from a Sunday League amateur to a former legend. Use the **Live Job Centre** to apply for roles, face dynamic board interviews, and work your way to the top of the world rankings.

---

## 🛠️ How It Works (Dev Notes)

*   **Simulation Hybrid:** To ensure statistical stability and performance, background league games run on a deterministic math engine. Gemini is reserved exclusively for high-stakes, user-facing interactions (Matches, Interviews, Press) where narrative nuance matters.
*   **State Machine:** Custom tournament logic handles the complex Swiss Format and multi-tier knockout brackets, ensuring the AI respects the rules of the competition.
*   **Validation:** Every AI response passes through a "Hawk-Eye" validator to ensure the LLM respects the game state (e.g., preventing goals from players who were sent off).

---

## 🗺️ Roadmap

*   **📈 Reputation Arc:** Persistent manager sentiment tracking from fans and the press.
*   **💾 Cloud Saves:** Continue your dynasty across devices.
*   **💎 Youth Academy:** AI-generated scouting reports for "Newgen" stars.

---

**License:** MIT | *Not affiliated with or endorsed by any official football leagues or organizations.*
