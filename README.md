
# ⚽ Gemini Football Manager '27
**The World's First Multimedia AI Sports Simulation**

> **Current Build:** v2.7 (The "Unhinged" Kit Update)
> **Engine:** React 19 · TypeScript · Google GenAI SDK · Tailwind CSS

**Gemini Football Manager '27 (GFM '27)** is a hybrid simulation engine. It combines a rigid, deterministic mathematical core with a creative, generative AI layer to produce a football world that feels alive, visually distinct, and narratively deep.

---

## 📊 The FIFA vs. GFM Audit (10-Month Cycle)

*An economic analysis of the Sep-July football season lifecycle.*

### 1. The Cost of Access
Comparing a standard AAA title ($70 flat) vs. the GFM AI Subscription Model ($19.99/mo).

| Timeline | FIFA / FC 25 | GFM '27 (Gemini Adv.) | Status |
| :--- | :--- | :--- | :--- |
| **Month 1 (Sep)** | $70.00 | $19.99 | ✅ GFM Cheaper |
| **Month 3 (Nov)** | $70.00 | $59.97 | ✅ GFM Cheaper |
| **Month 4 (Dec)** | $70.00 | $79.96 | 🚨 **Crossover Point** |
| **Month 10 (July)** | **$70.00** | **$199.90** | ❌ GFM 2.8x Cost |

**Insight:** For a pure consumer, GFM is significantly more expensive over a full season cycle.

### 2. The Streamer Arbitrage (Profit Logic)
Unlike FIFA, GFM provides **commercial rights** to generated assets. The math flips when the user becomes a creator.

**Unit Economics of a Viral Clip:**
*   **Cost to Generate (COGS):** ~$0.09 (Video $0.08 + Audio $0.005 + Text)
*   **Revenue (RPM):** ~$0.03 per 1,000 Views (Gaming Shorts Average)

| User Tier | Views/Clip | Monthly Clips | Est. Revenue | Sub Cost | **Net P/L** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Casual** | 0 | 0 | $0.00 | -$19.99 | **-$19.99** |
| **Aspiring** | 10,000 | 30 | $9.00 | -$19.99 | **-$10.99** |
| **Partner** | 50,000 | 30 | $45.00 | -$19.99 | **+$25.01** |
| **Pro** | 1,000,000 | 15 | $450.00 | -$19.99 | **+$430.01** |

**Verdict:** The "Pro" user does not just play the game; they run a profitable content studio *using* the game. The break-even point is approximately **667,000 aggregated views per month**.

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
