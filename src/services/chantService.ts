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
    const templates = CHANT_BOOK[trigger] || CHANT_BOOK.winning;
    const template = chooseTemplate(trigger, templates);
    return {
        tune: template.tune,
        intensity: template.intensity,
        lyrics: template.lyrics.map((line) => fill(line, teamName, playerName)),
    };
};
