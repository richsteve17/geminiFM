
import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;
const api_key_raw = process.env.API_KEY || process.env.GEMINI_API_KEY;

const getAIInstance = (): GoogleGenAI => {
    if (!_ai) {
        if (!api_key_raw || api_key_raw === "undefined" || api_key_raw === "null") {
            console.warn("GEMINI_API_KEY / API_KEY is not set. Using local simulation fallback.");
            throw new Error("API_KEY_NOT_SET");
        }
        _ai = new GoogleGenAI({ apiKey: api_key_raw });
    }
    return _ai;
};

// Define a proxy object for ai to lazily load and avoid crashing on startup
export const ai = {
    get models() {
        return getAIInstance().models;
    },
    get operations() {
        return getAIInstance().operations;
    }
};

const model = 'gemini-3-flash-preview';

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
    You are the Capo of the ${teamName} Ultras. You are a musical genius who adapts classic songs into football chants.

    CONTEXT: ${context}

    TASK: Write a 4-line chant.
    
    CRITICAL INSTRUCTION:
    You MUST pick a specific, well-known tune FIRST, and then write lyrics that MATCH THE SYLLABLE COUNT AND RHYTHM of that tune exactly.
    Do not just write a poem. It must be singable to the melody.

    Example:
    Tune: "Sloop John B"
    Original: "We come on the sloop John B, my grandfather and me" (13 syllables)
    Chant: "We follow the ${teamName}, across the land and sea" (13 syllables)

    RULES:
    1. Pick a tune from: "Yellow Submarine", "Sloop John B", "Seven Nation Army", "Hey Jude", "Anarchy in the UK", "Twist and Shout".
    2. Write lyrics that fit the melody perfectly.
    3. Rhyme Scheme: AABB or ABAB.
    4. If losing, be cynical/funny.
    5. If winning, be rowdy.

    Return JSON ONLY:
    {
        "lyrics": ["Line 1", "Line 2", "Line 3", "Line 4 (Punchline)"],
        "tune": "Name of the song used",
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
