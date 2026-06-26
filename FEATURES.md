
# 📘 Feature Guide: AI Football Manager

## 📡 Generative Media Suite
AI Football Manager utilizes generative AI to create a uniquely immersive experience, elevating standard text-based simulations into a living, breathing media environment.

### 🎙️ AI Commentary
- **Model:** `gemini-2.5-flash-preview-tts` (or equivalent)
- **How it works:** When a key event happens during a match, the AI's textual description is passed to a TTS model with an "Excited Commentator" system instruction.
- **Playback:** The app synthesizes audio directly in the browser to provide real-time commentary for match highlights.

### 🎥 Viral Clips & Social Media
- **Feature:** Generate social media posts and reactions based on the match events.
- **Logic:** After significant events, the AI creates short, punchy captions and synthesizes voiceovers mimicking the hyper-reactive nature of modern footballing social media.

### 📺 Replay Engine
- **How it works:**
    1.  The Match Engine generates a text description of the goal.
    2.  This text is enhanced with visual prompts ("Cinematic angle, professional stadium lighting").
    3.  A video-generation model creates a short replay clip. (Requires supported Google Cloud Project and API keys).
    4.  The app polls for completion and overlays a video player.

---

## 🎨 Dynamic Club & Managerial Identity
The UI adapts to your club's identity with granular control.

- **Kit Selector:** Before starting, visualize your club's identity via home, away, and alternate kit color schemes.
- **Behavior:**
    - **Instant Preview:** The selected palette is applied directly to the game's UI (headers, buttons, gradients).
    - **Gameplay Integration:** The selected palette persists throughout the manager career, coloring your menus and highlighting your club's colors.

---

## 🌍 Real-World & Fictional Scouting

The Scouting Network offers two distinct ways to build your squad:

- **Legacy Mode (Fictional):** The AI invents entirely new players with unique backstories, potential ceilings, and playstyles. Perfect for long-term saves taking place decades into the future.
- **Real World Mode (Grounded):** The AI searches the live internet to find real players matching your criteria.
    - *Query:* "Youngest starting centre-back in the Premier League"
    - *Result:* The AI identifies the real-world player and translates their attributes into game-compatible stats for you to sign.

---

## 🏟️ The Match Engine 

The simulation core is a mathematical framework brought to life by the Gemini API:

- **Momentum System:** A mathematical tug-of-war driven by player ratings, match events, and your touchline shouts.
- **Tactical Adjustments:** Use precise touchline commands ("Demand More", "Focus") to shift the momentum in key moments.
- **Live Upgrades:** Dynamically adjust the match speed (Slow, Normal, Fast, Instant) directly from the touchline to control how you consume the action.
- **Atmosphere:** The "Decibel Meter" visualizes the crowd's mood based on performance.
    - *Green:* Party Atmosphere.
    - *Red:* Hostile / Discontent.
    - *Chants:* The AI generates context-aware text chants based on the scoreline and team history.

---

## 👔 Deep Interactions & Management

- **Dynamic Job Interviews:** Board expectations shift based on the club's current predicament (e.g. relegation battle vs. title push). 
- **Player Talks:** Manage your relationship with players. Have fluid conversations about their role in your tactic, future plans, or expected playing time, directly influencing their decision to sign or leave.
- **Continental Football:** Compete across regular leagues and progress to comprehensive European tournament structures.
