
# 📘 Feature Guide: Galácticos Media Update (v2.5)

## 📡 Generative Media Suite

The v2.5 update introduces the "Media Layer," allowing the game to generate assets on the fly.

### 🎙️ AI Commentary (TTS)
*   **Model:** `gemini-2.5-flash-preview-tts`
*   **How it works:** When a goal is scored, the text description (e.g., "Haaland smashes it top bin") is sent to the TTS model with a specific "Excited Commentator" system instruction.
*   **Playback:** The app decodes the raw PCM audio stream directly in the browser using the Web Audio API.

### 🎥 Streamer Studio Audio (New in v2.5)
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
