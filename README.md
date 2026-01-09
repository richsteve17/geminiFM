# ⚽ Gemini Football Manager '27
**The World's First Multimedia AI Sports Simulation**

> **Current Build:** v2.4 (Galácticos Media Update)
> **Engine:** React 19 · TypeScript · Google GenAI SDK · Tailwind CSS

**Gemini Football Manager '27 (GFM '27)** is a hybrid simulation engine. It combines a rigid, deterministic mathematical core with a creative, generative AI layer to produce a football world that feels alive, visually distinct, and narratively deep.

---

## 🏗️ Architecture: Truth vs. Vibes

To build a simulation that is both **fair** and **immersive**, we separate the "Truth" (State) from the "Vibes" (Presentation).

### 🟢 The Truth (Deterministic Layer)
*The game logic that must be mathematically accurate.*
1.  **The Math Engine:** League tables, goal difference, contract expiry dates, and wage budgets are calculated via strict TypeScript logic. The AI **cannot** hallucinate a table standing.
2.  **Swiss Model Fixtures:** The Champions League draw uses a real Swiss-system pairing algorithm to generate valid fixtures for 36 teams.
3.  **Validation:** A "Hawk-Eye" system prevents the AI from narrating impossible events (e.g., a player on the bench scoring a goal).

### 🟣 The Vibes (Generative Layer)
*The presentation layer that creates the illusion of a broadcast.*
1.  **Match Narrative:** `gemini-2.0-flash-exp` receives the math (e.g., *Momentum: +8*) and converts it into a story (*"The home fans are deafening as the team presses high!"*).
2.  **The Pitch:** The moving dots are **not** physics simulations. They are CSS animations driven by the "Momentum" variable to visualize the flow of the game.
3.  **Atmosphere:** The decibel meter is a reactive visualizer based on the scoreline, not real audio analysis.

---

## 📡 The Media Layer (New in v2.4)

GFM '27 now generates multimedia assets on-the-fly using specific Google models.

### 1. 🎙️ AI Commentary (TTS)
*   **Model:** `gemini-2.5-flash-preview-tts`
*   **Trigger:** Click the 🎧 icon on a Goal event.
*   **Behavior:** The text description is sent to the model with an "Excited Commentator" system instruction. The resulting raw PCM audio is decoded and played in the browser.
*   **Caching:** Audio clips are cached in memory. Clicking the button twice does **not** cost extra tokens.

### 2. 📺 Instant Replay (Veo)
*   **Model:** `veo-3.1-fast-generate-preview`
*   **Trigger:** Click the 📹 icon on a Goal event.
*   **Behavior:** The engine constructs a visual prompt (*"Cinematic side-angle shot, football match, green grass, [Goal Description]"*) and polls the Veo API.
*   **Latency:** Generation takes ~1-2 minutes. The UI handles polling asynchronously.

### 3. 🌍 Real-World Scouting (Grounding)
*   **Model:** `gemini-3-flash-preview` + Google Search Tool
*   **Trigger:** Toggle "Use Real World Network" in Scouting.
*   **Behavior:** Instead of inventing players, the AI queries Google Search (*"Current top scorer Eredivisie under 21"*) and maps the real-world data into game-compatible stats.

---

## 🛠️ Technical Implementation

### Prerequisites
*   Node.js (v18+)
*   A Google Cloud Project with a billing-enabled API Key (Veo requires a paid tier).

### Environment Variables
Create a `.env` file in the root:
```env
# Required for all AI features
VITE_GEMINI_API_KEY=your_api_key_here
```

### Run Locally
```bash
npm install
npm run dev
```

---

## ⚠️ Cost & Privacy Note

*   **Token Usage:** The deterministic simulation is free (local CPU). Narrative generation uses text tokens.
*   **Media Costs:** Generating Video (Veo) and Audio (TTS) consumes significantly more quota than text.
*   **Safety:** The app includes a simple in-memory cache to prevent re-generating the same media asset twice, protecting your API quota.

---

## 📝 License
MIT Licensed. Built as a showcase for the Google GenAI SDK.