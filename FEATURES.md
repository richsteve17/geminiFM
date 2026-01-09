
# 📋 Detailed Feature Guide: Gemini Football Manager '27

This document outlines the specific mechanics, algorithms, and gameplay loops implemented in GFM '27.

---

## 🏟️ The Match Engine (PitchView™)

The match engine is the heart of GFM '27. It is not a text feed; it is a visual simulation driven by AI.

### 1. Visual Momentum System
*   **The Dots:** The 2D pitch visualizer renders 22 dots (players) and a ball.
*   **Momentum Calculation:** The game calculates a "Momentum" integer (-10 to +10) based on tactical matchups, home advantage, and player ratings.
*   **Dynamic Positioning:** 
    *   If Momentum is +10 (Home Dominance), the Home team's dots physically press high into the opponent's third.
    *   If Momentum is -10 (Away Dominance), the Home team "Parks the Bus" inside their own box.
*   **Goal Animations:** When a goal event is triggered, a CSS-based animation sequence plays, celebrating the scorer.

### 2. Hybrid Simulation Loop
The match is simulated in 15-minute segments (or 1-minute increments during "Crunch Time").
1.  **State Snapshot:** The code sends a JSON snapshot to Gemini (Score, Minute, Players on Pitch, Fatigue Levels).
2.  **Narrative Generation:** Gemini generates the events (Goals, Cards, Commentary).
3.  **Trait Injection:** The prompt explicitly instructs Gemini to use player traits. 
    *   *Example:* A "Volatile" player has a 30% higher weight for Yellow Cards if the team is losing.
    *   *Example:* A "Leader" reduces the chance of conceding a late goal.

### 3. Tactical Intervention
*   **Shouts:** At half-time, you can issue shouts like "Demand More" or "Tighten Up". These inject modifiers into the next simulation prompt.
*   **Subs:** The "Hawk-Eye" system tracks which players are on the pitch. If you sub off your striker, they cannot score in the next segment.

---

## 👔 Tactical Suite & Analysis

### 1. Drag-and-Drop Tactics
*   **Visual Board:** Click any player on the tactics board to select them, then click another slot to swap.
*   **Formation Logic:** The board supports 6 presets (4-4-2, 4-3-3, 5-3-2, 3-5-2, 4-2-3-1, 4-5-1).

### 2. Role Familiarity Algorithm
The engine calculates a **Tactical Efficiency Score (0-100%)** based on where players are placed.
*   **Perfect Fit:** A 'ST' playing in a 'ST' slot. (No Penalty)
*   **Adaptable:** A 'RB' playing 'RWB' or 'CB'. (Minor Penalty: -5 Efficiency)
*   **Out of Position:** A 'ST' playing 'CB'. (Major Penalty: -50 Efficiency)
*   **Critical Failure:** No Goalkeeper selected. (Massive Penalty)

*Impact:* A low efficiency score drastically reduces your team's "Momentum" calculation in the match engine.

---

## 🌍 The Living World

### 1. Champions League (Swiss Model)
GFM '27 implements the modern UCL format.
*   **Algorithm:** A custom script generates fixtures for 36 teams.
*   **Scheduling:** UCL matches are injected into the calendar on Weeks 5, 9, 13, 17, 21, 25, 29, and 33.
*   **League Table:** A unified table tracks all 36 teams. The top 8 auto-qualify (visualized with green borders), while 9-24 go to playoffs (yellow borders).

### 2. Global News Feed
*   **Dynamic Content:** The news feed isn't pre-written. It generates headlines based on the actual simulation results.
*   **Event Types:** Reports on Injuries, Transfer Rumors, International Call-ups, and Chemistry Rifts.

### 3. Chemistry Rifts 🔗
*   **Trigger:** If two club teammates play *against* each other in an International Tournament (e.g., Argentina vs Brazil), there is a chance they develop a "Rift."
*   **Effect:** When they return to your club, you will see a "Broken Link" icon. These players perform worse when on the pitch together for 4-8 weeks.

---

## 💰 Financials & Negotiations

### 1. The Agent Interaction (LLM Chat)
Negotiations are not multiple-choice. You chat with an AI Agent.
*   **Personality Driven:** A "Mercenary" agent will demand huge fees and be rude. A "Professional" agent will be courteous.
*   **Context Aware:** The agent knows if you are a "Big Club" or a "Small Club" and adjusts demands accordingly.

### 2. The Contract Table
Once the agent is happy, you enter the Offer Stage.
*   **Wage Slider:** Set the weekly wage.
*   **Visual Context:** The UI shows the player's *current* wage vs. your *offer*, plus your squad's average wage, helping you maintain a wage structure.
*   **Financial Fair Play:** The "Finance" tab shows your Total Weekly Wage Bill vs. The Board's Allowed Budget.

---

## 🔎 Scouting Network 2.0

### Natural Language Search
Traditional games use filters (Pace > 15). GFM '27 uses semantics.
*   **Input:** *"Find me a cheap replacement for Salah who is young and plays in Italy."*
*   **Process:** The AI interprets "replacement for Salah" as "Left-footed RW, High Dribbling, Goal Threat." It interprets "Cheap" relative to your club's prestige.
*   **Output:** The Scout generates 3 unique player profiles that match this narrative description.

---

## 💾 System & Persistence

### Cloud Dynasties
*   **LocalStorage Save:** The entire game state (teams, fixtures, players, history) is serialized into a single JSON object and stored in the browser.
*   **Auto-Save:** The game auto-saves after every match and major event.
*   **Resume:** You can close the tab and hit "Continue Career" to pick up exactly where you left off.

### Manager Reputation
*   **0-100 Scale:** You start at a level defined by your background.
*   **Fluctuation:** Winning against big teams boosts reputation. Getting relegated tanks it.
*   **Unlocks:** High reputation unlocks job interviews at elite clubs (Real Madrid, City, etc.).
