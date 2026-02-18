
# 📘 Feature Guide: Galácticos Media Update (v2.6)

## 📡 Generative Media Suite & Creator Economy

The v2.6 update fully integrates the "Streamer Mode" mechanics, allowing users to run a profitable content studio within the game.

### 💰 The Streamer Arbitrage Engine (New in v2.6)
*   **Net Profit Calculation:** The Viral Clip Studio now calculates the real-world profitability of your content.
    *   **Revenue:** Uses an estimated RPM ($0.03 per 1k views) for Gaming Shorts.
    *   **COGS (Cost of Goods Sold):** Subtracts the real API cost of generation ($0.08 Veo + $0.005 TTS + $0.005 Text).
    *   **Result:** You see a live "Net Profit" metric (e.g., "+$2.91 Net") on every clip you generate.

### 🎙️ AI Commentary (TTS)
*   **Model:** `gemini-2.5-flash-preview-tts`
*   **How it works:** When a goal is scored, the text description (e.g., "Haaland smashes it top bin") is sent to the TTS model with a specific "Excited Commentator" system instruction.
*   **Playback:** The app decodes the raw PCM audio stream directly in the browser using the Web Audio API.

### 🎥 Streamer Studio Audio
*   **Feature:** TikTok-style viral clips now include auto-generated voiceovers.
*   **Logic:** When you click the purple "Clip It" button, the AI generates a hype caption ("SCENES!"). This caption is immediately sent to the TTS engine to create a voiceover that plays automatically when the vertical video loads.

### 📺 Instant Replay (Veo)
*   **Model:** `veo-3.1-fast-generate-preview`
*   **How it works:**
    1.  The Match Engine generates a text description of the goal.
    2.  This text is enhanced with visual prompts ("Cinematic angle, professional stadium lighting, 4k").
    3.  Veo generates a video URI.
    4.  The app polls for completion and overlays a video player.

---

## 🎨 Dynamic Club Theming (New in v2.7)

The UI now adapts to your club's identity with granular control.

*   **3-Card Kit Selector:** Before starting, visualize your club's identity via three kit cards.
    *   **Primary:** The classic home strip.
    *   **Secondary:** The traditional away colors.
    *   **Third:** The "Unhinged" option. Often neon, dark, or clashing colors (e.g., Chelsea's pink/black) for when you want to break the mold.
*   **Behavior:**
    *   **Instant Preview:** Clicking a kit card instantly applies that palette to the game UI (headers, buttons, gradients).
    *   **Gameplay Integration:** The selected palette persists throughout the manager career, coloring the Start Screen background and accentuating important metrics.

---

## 🌍 Real-World Scouting (Grounding)

The Scouting Network has been upgraded with **Google Search Grounding**.

*   **Legacy Mode (Fictional):** The AI invents players ("Ricardo Silva, 19, Brazil") based on probability distributions. Good for long-term saves where real players would retire.
*   **Real World Mode (Grounded):** The AI searches the live internet.
    *   *Query:* "Fastest winger in the Premier League under 23"
    *   *Result:* The AI finds players like **Mickey van de Ven** or **Brennan Johnson** with their actual current stats.

---

## 🏟️ The Match Engine (PitchView™)

The simulation core remains a hybrid system:

*   **Momentum System:** A mathematical tug-of-war (-10 to +10) driven by player ratings and tactics.
*   **Visualizer:** The 2D pitch responds to Momentum. If you are dominating (+8), your team's dots will press high up the pitch.
*   **Atmosphere:** The "Decibel Meter" visualizes the crowd's mood.
    *   *Green:* Party Atmosphere.
    *   *Red:* Toxic/Hostile.
    *   *Chants:* The AI generates rhyming, context-aware chants based on the scoreline.

---

## 👔 Tactical & Roster Systems

*   **Swiss Model UCL:** A custom algorithm generates a 36-team league phase for the Champions League.
*   **Chemistry Rifts:** Players can develop feuds (e.g., after playing against each other internationally), reducing team coherence.
*   **Tactical Analysis:** The AI analyzes your formation for logical errors (e.g., playing a Striker in Goal) and warns you before kickoff.
