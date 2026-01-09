
# 📘 Manager's Handbook: Mechanics & Features

This document outlines the specific mechanics, algorithms, and gameplay loops implemented in GFM '27.

---

## 🏟️ The Match Engine (PitchView™)

The match engine is not a text feed; it is a visual simulation driven by a hybrid of deterministic math and AI reasoning.

### 1. Visual Momentum System
*   **The Dots:** The 2D pitch visualizer renders 22 dots (players) and a ball.
*   **Momentum Calculation:** The game calculates a "Momentum" integer (-10 to +10) based on tactical matchups, home advantage, and player ratings.
*   **Dynamic Positioning:** 
    *   If Momentum is **+10 (Home Dominance)**, the Home team's dots physically press high into the opponent's third.
    *   If Momentum is **-10 (Away Dominance)**, the Home team "Parks the Bus" inside their own box.
*   **Goal Animations:** When a goal event is triggered, a CSS-based animation sequence plays, celebrating the scorer.

### 2. Atmosphere Engine (New!)
*   **Decibel Meter:** A visual bar chart that reacts to Momentum. High momentum = Green (Party Atmosphere). Low Momentum = Red (Hostile/Toxic).
*   **Punk Chant Generator:** Using Gemini, the game generates rhyming terrace chants in the style of Ska-Punk. 
    *   *Context Aware:* If you are losing 0-3, the chant will be cynical/dark humor. If you win a penalty, it will be aggressive.

### 3. Tactical Intervention
*   **Shouts:** At half-time, you can issue shouts like "Demand More" or "Tighten Up". These inject weights into the simulation prompt.
*   **Subs:** The "Hawk-Eye" system tracks who is on the pitch. If you sub off your striker, the AI cannot generate a goal for them.

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

### 3. Critical Error Detection
The AI scans your lineup before kickoff for logical fallacies:
*   **"Salah in Goal":** If an outfield player is in the GK slot, the Assistant Manager will scream at you.
*   **Injury Risk:** Starting a player with <50% Condition triggers a warning.
*   **Chemistry Clash:** Starting two players with a "Rift" triggers a warning.

---

## 🌍 The Living World & Roster Management

### 1. Champions League (Swiss Model)
GFM '27 implements the modern UCL format.
*   **Algorithm:** A custom script generates fixtures for 36 teams.
*   **Scheduling:** UCL matches are injected into the calendar on Weeks 5, 9, 13, 17, 21, 25, 29, and 33.
*   **League Table:** A unified table tracks all 36 teams. The top 8 auto-qualify (green borders), while 9-24 go to playoffs (yellow borders).

### 2. International Breaks & Chemistry Rifts 🔗
*   **Weeks 10, 20, 30:** The league pauses for International Duty.
*   **The Rift Mechanic:** If two club teammates play *against* each other in an International match (e.g., Argentina vs Brazil), there is a calculated chance they return with a **Chemistry Rift**.
*   **Effect:** Players with a Rift have a "Broken Link" icon. When both are on the pitch, the team suffers a -5 Momentum penalty due to "poor communication."

### 3. Natural Language Scouting
Traditional games use filters (Pace > 15). GFM '27 uses semantics.
*   **Input:** *"Find me a cheap replacement for Salah who is young and plays in Italy."*
*   **Process:** The AI interprets "replacement for Salah" as "Left-footed RW, High Dribbling, Goal Threat." It interprets "Cheap" relative to your club's prestige.
*   **Output:** The Scout generates 3 unique player profiles that match this narrative description.

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

## 💾 System & Persistence

### Cloud Dynasties (LZ-String)
*   **Compression:** The game state is complex. We use `lz-string` to compress the JSON state into a small UTF-16 string.
*   **LocalStorage:** Saves are stored in your browser.
*   **Cross-Device:** You can "Copy Save to Clipboard" and paste it on another device to transfer your career.

### Manager Reputation
*   **0-100 Scale:** You start at a level defined by your background.
*   **Fluctuation:** Winning against big teams boosts reputation. Getting relegated tanks it.
*   **Unlocks:** High reputation unlocks job interviews at elite clubs (Real Madrid, City, etc.) in the Job Centre.
