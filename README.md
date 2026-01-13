
# ⚽ Gemini Football Manager '27
**The World's First Multimedia AI Sports Simulation**

> **Current Build:** v2.6 (Stability & Live Engine Update)
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
1.  **Live Match Narrative:** `gemini-2.0-flash-exp` receives the math (e.g., *Momentum: +8*) and converts it into a story (*"The home fans are deafening as the team presses high!"*).
2.  **The Pitch:** The moving dots are **not** physics simulations. They are CSS animations driven by the "Momentum" variable to visualize the flow of the game.
3.  **Atmosphere:** The decibel meter is a reactive visualizer based on the scoreline, not real audio analysis.

---

## 📡 The Media Layer (v2.5+)

GFM '27 generates multimedia assets on-the-fly using Google models.

### 1. 🎙️ AI Commentary & Viral Voiceover
*   **Model:** `gemini-2.5-flash-preview-tts`
*   **Trigger:** Click the 🎧 icon on a Goal event OR open a Viral Clip.
*   **Behavior:** The app synthesizes "Excited Commentator" audio for standard replays, and "Viral Hype" voiceovers for vertical social clips.
*   **Caching:** Audio clips are cached in memory to save quota.

### 2. 📺 Instant Replay (Veo)
*   **Model:** `veo-3.1-fast-generate-preview`
*   **Trigger:** Click the 📹 icon on a Goal event.
*   **Behavior:** The engine constructs a visual prompt (*"Cinematic side-angle shot, football match, green grass, [Goal Description]"*) and polls the Veo API.
*   **Latency:** Generation takes ~1-2 minutes. The UI handles polling asynchronously.

### 3. 🌍 Real-World Scouting (Grounding)
*   **Model:** `gemini-3-flash-preview` + Google Search Tool
*   **Trigger:** Toggle "Use Real World Network" in Scouting.
*   **Behavior:** The AI searches the live internet (*"Fastest winger in the Premier League under 23"*) and maps real-world data into game-compatible stats.

---

## 📊 Business & Unit Economics (Projected)

*Analysis based on Google Cloud / Vertex AI public pricing models (Flash/Neural2/Video).*

### 🏷️ Pricing Per Feature (Unit Cost)

| Feature | Model | Est. Cost | Unit Definition |
| :--- | :--- | :--- | :--- |
| **Match Sim (Text)** | `gemini-2.0-flash` | **$0.0003** | Per 10-minute game chunk (2k tokens in, 500 out) |
| **Scout Report** | `gemini-3-flash` (Grounding) | **$0.0350** | Per Google Search query execution |
| **Commentary** | `gemini-2.5-flash-tts` | **$0.0050** | Per 15-second audio clip (Goal call) |
| **Instant Replay** | `veo-3.1-preview` | **$0.0800** | Per 5-second video generation |

### 📈 User Tiers & Margins

Assumptions per User per Season (38 Matches):

#### 1. Basic Scout (Free Tier)
*   **Usage:** Text Sim Only. No Media. Fictional Scouting.
*   **Cost/Season:** ~$0.25 (Text Tokens)
*   **Revenue:** Ad-supported or Free to Play.

#### 2. The Gaffer ($4.99/mo)
*   **Usage:** Text Sim + 5 Real World Scouts/mo + Unlimited TTS Commentary.
*   **Frequency:** 100 Goals/Season (TTS) + 20 Searches.
*   **Cost/Season:**
    *   Text: $0.25
    *   TTS: $0.50 (100 clips * $0.005)
    *   Search: $0.70 (20 searches * $0.035)
    *   **Total:** ~$1.45
*   **Margin:** ~70%

#### 3. Galáctico Owner ($19.99/mo)
*   **Usage:** Full Media Suite. Veo Replays enabled.
*   **Frequency:** Generates 1 Video Replay per match (38/season).
*   **Cost/Season:**
    *   Base Costs: $1.45
    *   Video: $3.04 (38 clips * $0.08)
    *   **Total:** ~$4.49
*   **Margin:** ~77% (High margin, but high compute risk)

### 📉 Caching Assumptions
*   **TTS Cache:** 15% Hit Rate. (Generic phrases like "What a goal!" are cached; specific names trigger generation).
*   **Video Cache:** 100% Hit Rate for re-watches. Assets are generated once per event ID and stored in `mediaCache` (session) or S3 (production).

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

## 📝 License
MIT Licensed. Built as a showcase for the Google GenAI SDK.
