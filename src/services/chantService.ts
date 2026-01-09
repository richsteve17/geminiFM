
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error("API_KEY not set");

const ai = new GoogleGenAI({ apiKey: API_KEY });
const model = 'gemini-2.0-flash-exp';

export interface Chant {
    lyrics: string[];
    tune: string;
    intensity: 'low' | 'medium' | 'high';
}

export const generatePunkChant = async (
    teamName: string,
    trigger: 'goal' | 'bad_call' | 'winning' | 'losing',
    playerName?: string
): Promise<Chant> => {

    let context = "";
    if (trigger === 'goal') context = `We just scored! Hero is ${playerName}. Celebration. High energy.`;
    if (trigger === 'bad_call') context = `Ref made a bad call against ${teamName}. Anger. Hostile.`;
    if (trigger === 'winning') context = `We are winning late. Arrogance. Party vibe.`;
    if (trigger === 'losing') context = `We are losing badly. Depression. Dark humor. "Sack the board".`;

    const prompt = `
    You are the Capo of the ${teamName} Ultras. You love Ska-Punk and Oi! music (Cock Sparrer, The Specials, Dropkick Murphys).

    Generate a 4-line terrace chant based on: ${context}

    RULES:
    1. Must rhyme (AABB or ABAB).
    2. Must have a catchy, stomping rhythm.
    3. If losing, be cynical/funny.
    4. If winning, be rowdy.
    5. Do not use generic "Olé Olé". Make it specific to the situation.

    Return JSON ONLY:
    {
        "lyrics": ["Line 1", "Line 2", "Line 3", "Line 4 (Punchline)"],
        "tune": "Name of a classic song it sounds like (e.g. Yellow Submarine, Anarchy in the UK)",
        "intensity": "high"
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text || "{}";
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanText);
    } catch (e) {
        // Fallback if AI fails (The "Offline Mode" Setlist)
        return {
            lyrics: [
                `We love you ${teamName}, we do!`,
                `We love you ${teamName}, we do!`,
                `We love you ${teamName}, we do!`,
                `Oh ${teamName} we love you!`
            ],
            tune: "Standard Terrace Chant",
            intensity: 'medium'
        };
    }
};
