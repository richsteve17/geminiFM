import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY || "" });
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
    You are the Capo of the ${teamName} Ultras. You love Ska-Punk (Rancid, Pennywise, Dropkick Murphys, The Specials).

    Generate a 4-line terrace chant based on: ${context}

    RULES:
    1. Must rhyme.
    2. Must fit a fast 4/4 punk beat.
    3. If losing, be cynical/funny.
    4. If winning, be rowdy.

    Return JSON ONLY:
    {
        "lyrics": ["Line 1", "Line 2", "Line 3", "Line 4 (Punchline)"],
        "tune": "Name of a classic Punk/Ska song it sounds like",
        "intensity": "high"
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
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
