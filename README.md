
# ⚽ Gemini Football Manager '27
**The World's First LLM-Driven Sports Simulation**

> **Current Build:** v2.1 (Atmosphere & Roster Update)
> **Engine:** React 19 · TypeScript · Google Gemini 2.0 Flash · Tailwind CSS

**Gemini Football Manager '27 (GFM '27)** is a paradigm shift in sports strategy games. Unlike traditional simulators (like Football Manager) that rely on static database lookups and rigid decision trees, GFM '27 uses a **Hybrid AI Architecture** to generate a living, breathing football world.

Every match report, press conference, transfer negotiation, and tactical analysis is generated in real-time by **Google's Gemini 2.0 Flash**, ensuring no two careers are ever the same.

---

## 🧠 The Architecture: "Hawk-Eye" Hybrid Engine

The core technical challenge of LLM gaming is "Hallucination" (e.g., the AI saying a player scored when they are on the bench). GFM '27 solves this with a strict separation of **Deterministic State** and **Generative Narrative**.

### 1. The Deterministic Layer (The Referee)
Behind the scenes, a hard-coded TypeScript engine manages the laws of physics and the rules of the game.
*   **Validation:** It is impossible for the AI to hallucinate a goal by a player who is on the bench. The code pre-calculates valid scorers.
*   **State Management:** Tracks `Condition` (0-100%), `Contract Lengths`, `Yellow Cards`, and `League Tables` with mathematical precision.
*   **Swiss Model Logic:** The Champions League fixtures are generated using a mathematically accurate Swiss-system pairing algorithm (36 teams, 8 rounds).

### 2. The Generative Layer (The Color Commentator)
We feed the deterministic state into Google Gemini via strict JSON schemas.
*   **Context Injection:** The AI is told: *"Liverpool is losing 0-1 at home. It is the 88th minute. Trent Alexander-Arnold has the 'Leader' trait."*
*   **Narrative Output:** The AI generates the specific event description: *"Trent screams at his teammates to push forward, whipping a desperate cross into the box..."*
*   **Logic Influencer:** The AI *decides* the probability of events based on semantic understanding of traits (e.g., a "Volatile" player is more likely to get sent off in a derby).

### 3. The Atmosphere Layer (New in v2.0)
*   **Punk Chant Generator:** An experimental module that generates rhyming, rhythmic terrace chants based on the match state (Winning/Losing/Bad Call) using the style of Ska-Punk bands (Rancid/Specials).

---

## 🛠️ Technical Stack

*   **Frontend Framework:** [React 19](https://react.dev/) (utilizing new Hooks and Server Actions patterns where applicable).
*   **Language:** TypeScript (Strict Mode).
*   **Build Tool:** Vite.
*   **Styling:** Tailwind CSS (Utility-first for rapid UI iteration).
*   **AI Integration:** `@google/genai` SDK (Gemini 2.0 Flash Exp).
*   **Compression:** `lz-string` (Compresses 50kb JSON save states into ~4kb UTF-16 strings for LocalStorage).
*   **Visuals:** Custom CSS-based 2D Pitch Physics engine.

---

## 🚀 Installation & Setup

### Prerequisites
*   Node.js (v18+)
*   npm or yarn
*   A Google AI Studio API Key (Free tier works perfectly)

### Steps

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-username/gemini-football-manager.git
    cd gemini-football-manager
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory. You must provide a valid API key for the game to function.
    ```env
    VITE_GEMINI_API_KEY=your_google_ai_studio_key_here
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

---

## 🎮 Game Modes Overview

### 1. Club Career (The Sandbox)
*   **Leagues:** Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Championship, MLS.
*   **Scope:** Infinite seasons. Players age, contracts expire, and young prospects emerge via the scouting network.
*   **Economy:** Manage a weekly wage budget. Overspending reduces Board Confidence.

### 2. World Cup 2026 (The Prologue)
*   **Format:** Authentic 48-team tournament structure.
*   **Groups:** 12 Groups (A-L). Top 2 + 8 Best 3rd place teams advance to the Round of 32.
*   **Rosters:** 2026-projected squads for top nations (France, Brazil, England, Germany, Spain, Argentina).
*   **Objective:** Win the trophy to earn "Legend" reputation status for your subsequent club career.

### 3. Road to Glory (RPG Mode)
*   **Start Unemployed:** Create a manager avatar and define your backstory (Sunday League Amateur vs. Ex-International Pro).
*   **Reputation System:** Your starting reputation determines which clubs will grant you an interview.
*   **The Job Market:** A dynamic "Job Centre" updates weekly as AI managers are sacked or move clubs.

---

## 📝 License

This project is MIT Licensed. It is an experimental showcase of Large Language Models (LLMs) applied to complex simulation logic.
