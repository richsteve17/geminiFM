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

type ChantTrigger = 'goal' | 'bad_call' | 'winning' | 'losing';

interface ChantTemplate {
    tune: string;
    intensity: Chant['intensity'];
    lyrics: [string, string, string, string];
}

const CHANT_BOOK: Record<ChantTrigger, ChantTemplate[]> = {
    goal: [
        {
            tune: "Seven Nation Army (stomp clap)",
            intensity: 'high',
            lyrics: [
                "{PLAYER} hit it, net it, hear the whole end roar!",
                "Scarves up, boots up, kick the gates and shake the floor!",
                "{TEAM}, {TEAM}, we are marching to the drum!",
                "One more, one more, bury them and watch them run!",
            ],
        },
        {
            tune: "Guantanamera terrace rhythm",
            intensity: 'high',
            lyrics: [
                "We saw {PLAYER}, turning in the box tonight,",
                "Left foot, right foot, set the whole stand alight,",
                "{TEAM} are coming, louder than the rain,",
                "Sing it till it hurts and then sing it all again!",
            ],
        },
        {
            tune: "Hey Jude (na-na terrace ending)",
            intensity: 'high',
            lyrics: [
                "Hey {PLAYER}, take that chance and make it better,",
                "Hit it low, hit it true, and make us feel forever,",
                "{TEAM} are rising, hear the whole stand scream your name,",
                "Na na na-na-na-na, finish it again!",
            ],
        },
        {
            tune: "Yellow Submarine (bounce version)",
            intensity: 'high',
            lyrics: [
                "All our mates in red are marching to your beat,",
                "{PLAYER} just broke their line and sat them in their seats,",
                "{TEAM} keep pounding, never letting up tonight,",
                "Sing it from the Kop till the morning light!",
            ],
        },
    ],
    bad_call: [
        {
            tune: "Here We Go (terrace bounce)",
            intensity: 'high',
            lyrics: [
                "Ref you guessed it, wrong again tonight,",
                "Cards in your pocket, but your eyes ain’t right,",
                "{TEAM} keep going, we’ll do it the hard way,",
                "Beat the whistle too and send them home today!",
            ],
        },
        {
            tune: "Anarchy in the UK (terrace parody)",
            intensity: 'high',
            lyrics: [
                "No future in your whistle, ref, you lost the game,",
                "Wrong flag, wrong card, still we roar the same,",
                "{TEAM} don’t fold, we turn the heat right up,",
                "We’ll smash the script and lift this cup!",
            ],
        },
    ],
    winning: [
        {
            tune: "When the Saints (fast terrace version)",
            intensity: 'medium',
            lyrics: [
                "Clock keeps ticking, but we’re singing even louder,",
                "Every tackle now is cleaner and prouder,",
                "{TEAM} in front and the away end gone quiet,",
                "See it out, shut it down, start the party riot!",
            ],
        },
        {
            tune: "Twist and Shout (victory bounce)",
            intensity: 'high',
            lyrics: [
                "Run it down, shut it down, hear the stand shout,",
                "{TEAM} all over them, no way out,",
                "Keep your nerve and keep the back line tight,",
                "One more win and paint this town tonight!",
            ],
        },
    ],
    losing: [
        {
            tune: "Sloop John B (slow sarcastic sway)",
            intensity: 'low',
            lyrics: [
                "Same old story, chasing shadows in the rain,",
                "Still we’re here and still we sing again,",
                "{TEAM} we suffer, laugh, and carry on,",
                "Fix it next week, but tonight just bang this song!",
            ],
        },
        {
            tune: "Twist and Shout (slow mock-chant)",
            intensity: 'medium',
            lyrics: [
                "We came early, got soaked, and missed a sitter,",
                "Back line wobbling, midfield getting bitter,",
                "{TEAM} we’re hurting, but we’re still not gone,",
                "Raise your voice now and drag this lot along!",
            ],
        },
    ],
};

const choose = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const lastTuneByTrigger: Partial<Record<ChantTrigger, string>> = {};

const chooseTemplate = (trigger: ChantTrigger, templates: ChantTemplate[]) => {
    const lastTune = lastTuneByTrigger[trigger];
    const options = templates.filter((template) => template.tune !== lastTune);
    const selected = choose(options.length > 0 ? options : templates);
    lastTuneByTrigger[trigger] = selected.tune;
    return selected;
};

const fill = (line: string, teamName: string, playerName?: string) =>
    line
        .replace(/\{TEAM\}/g, teamName)
        .replace(/\{PLAYER\}/g, playerName || "the number nine");

export const generatePunkChant = async (
    teamName: string,
    trigger: ChantTrigger,
    playerName?: string
): Promise<Chant> => {
    // Generate context for Gemini prompt
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
        // Fallback to CHANT_BOOK templates if Gemini fails
        console.warn("Failed to generate chant via Gemini API, falling back to CHANT_BOOK templates:", e);
        const templates = CHANT_BOOK[trigger] || CHANT_BOOK.winning;
        const template = chooseTemplate(trigger, templates);
        return {
            tune: template.tune,
            intensity: template.intensity,
            lyrics: template.lyrics.map((line) => fill(line, teamName, playerName)),
        };
    }
};
