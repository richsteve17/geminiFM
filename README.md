
# ⚽ AI Football Manager

A next-generation football management simulation powered by AI.

> **Current Build:** v3.0 (The "Trophy Room & Manager Mobility" Update)
> **Engine:** React 19 · TypeScript · Google GenAI SDK (Gemini 3.5 Flash) · Tailwind CSS

## Overview

**AI Football Manager** uses cutting-edge generative AI to provide a dynamic, realistic, and deeply tailored football simulation experience. Moving beyond standard static databases and pre-written dialogue trees, this game integrates AI into every facet of club management: live match simulation, press conferences, player interactions, job interviews, and scouting.

## Core Features

### 🏟️ Dynamic Match Engine
A robust simulation engine that calculates match events based on team ratings, tactical analysis, formations, momentum, and real-time touchline shouts. 
- **Tactical Realism**: Players playing out of position lower efficiency. Formations dictate where the ball flows.
- **Momentum Shifts**: Your touchline shouts and tactical choices directly affect the game's momentum.
- **Live Upgrades**: Control game speed, pause the simulation, and step in tactically at any moment.

### 🎙️ AI-Powered Interactions (Gemini 3.5 Flash)
- **Press Conferences**: Face the media where your natural language answers affect your reputation, board confidence, and fan support. Powered by lightning-fast, zero-overhead **Gemini 3.5 Flash** models.
- **Meaningful Player Talks**: Manage morale, discuss contracts, playing time, and tactical roles using natural conversations.
- **Job Interviews**: Apply for managerial roles and convince the board through AI-driven interviews tailored to each club's unique vision, current standing, and expectations.

### 🏆 Trophy Room & Career Honors Board
- **Permanent Achievements Cabinet**: Dynamically records final standings, league titles, Champions League runs, and international successes across infinite seasons.
- **Silverware Tracker**: View your total career trophy counts (World Cups, Euros, Premier League, La Liga, Serie A, Bundesliga, Ligue 1) on a dedicated, premium glassmorphism dashboard.

### 🏢 Board Objectives, Sackings & Career Mobility
- **Dynamic Board Objectives**: Boards set realistic targets based on prestige and budget. Failing targets calculates a dynamic **Sacking Index**.
- **Manager Sacking**: Crossing the sacking threshold terminates your contract, penalizes reputation by 20%, and sends you back to the Job Centre to restart your career.
- **Resignations**: Voluntarily resign from your club at any time from the Finances dashboard to search for vacancies.
- **Weekly Poaching Offers**: Highly reputable managers receive unsolicited job offers directly in their News Feed. Accept or decline offers mid-season with dynamic fixture alignment.

### 📋 Deep Tactics & Squad Management
- **Formations & Roles**: Set precise formations and manage individual player conditions and roles.
- **Fitness & Fatigue**: Manage player condition across a demanding season. Rotating your squad is essential to prevent performance drops.
- **Teammate Bonds & Synergy**: Players Started together who share a `TeammateBond` receive a **5% potential growth rate bonus** representing partnership synergy.
- **European Competitions**: Compete in domestic leagues and progress to continental European tournaments utilizing true-to-life Swiss system tournament structures.

### 🌍 Intelligent Scouting
Scout talent using the AI network. Generate entirely new fictional wonderkids with unique personalities, or toggle the "Real World Network" to utilize Google Search grounding for real-world player discovery, seamlessly adapting them into the game's statistical framework.

### 🔊 Multimedia Integration
- **Generative Audio commentary**: Hear the matches come to life with AI-synthesized commentary for key events.
- **Atmosphere Widget**: Experience the roar of the crowd and team-specific chants generated dynamically based on match events and team lore.

## Technical Stack
- **Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **AI Core**: Google GenAI SDK (Gemini 3.5 Flash)

## Run Locally

### Prerequisites
- Node.js (v18+)
- A Google Cloud Project with a billing-enabled API Key.

### Environment Variables
Create a `.env` file in the root:
```env
# Required for all AI features
VITE_GEMINI_API_KEY=your_api_key_here
```

### Installation
```bash
npm install
npm run dev
```

## License
MIT Licensed. Built as a showcase for the Google GenAI SDK.
