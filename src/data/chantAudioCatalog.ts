import type { AtmosphereCueKind } from '../engine/atmosphereCues';

export type ChantRecording = {
    id: string;
    /** The songbook archetype, or a supplied club-encyclopedia identifier for a club anthem. */
    songbookId: string;
    title: string;
    clubAliases: readonly string[];
    cueKinds: readonly AtmosphereCueKind[];
    playerAliases?: readonly string[];
    url: string;
    durationSeconds: number;
    /** Provenance remains visible so a recording is never represented as generated audio. */
    source: {
        archive: 'manus-skills/chants_audio';
        sourceName: string;
        sourceId: string;
        sourceOffsetSeconds: number;
        recordingType: 'stadium' | 'terrace' | 'supporter-performance';
    };
    /** Exact supplied songbook/encyclopedia lines, only when that recording has them. */
    suppliedLyrics?: readonly string[];
};

const normaliseClub = (clubName: string) => clubName
    .trim()
    .toLowerCase()
    .replace(/\b(fc|afc|cf)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const stableHash = (value: string) => {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        result ^= value.charCodeAt(index);
        result = Math.imul(result, 16777619);
    }
    return result >>> 0;
};

/**
 * Short, loudness-normalised excerpts derived from recordings supplied in manus-skills.zip.
 * Original files are retained outside the app at /home/ubuntu/work/manus-fm-audio-source;
 * do not replace these entries with an original studio song merely because it shares a tune.
 */
export const CHANT_AUDIO_CATALOG: readonly ChantRecording[] = [
    {
        id: 'liverpool-allez-anfield',
        songbookId: 'allez_allez_allez',
        title: 'Allez Allez Allez — Anfield supporters',
        clubAliases: ['Liverpool'],
        cueKinds: ['kickoff', 'goal', 'pressure', 'fulltime'],
        url: '/audio/chants/liverpool-allez-anfield.mp3',
        durationSeconds: 30,
        source: {
            archive: 'manus-skills/chants_audio',
            sourceName: 'Allez allez allez on Anfield',
            sourceId: 'mEM8XbPqbys',
            sourceOffsetSeconds: 0,
            recordingType: 'stadium',
        },
        suppliedLyrics: ["We've conquered all of Europe, we're never gonna stop..."],
    },
    {
        id: 'liverpool-fields-anfield-road',
        songbookId: 'fields_of_athenry',
        title: 'The Fields of Anfield Road — supporters',
        clubAliases: ['Liverpool'],
        cueKinds: ['pressure', 'fulltime'],
        url: '/audio/chants/liverpool-fields-anfield-road.mp3',
        durationSeconds: 30,
        source: {
            archive: 'manus-skills/chants_audio',
            sourceName: 'Jamie Webster — The Fields of Anfield Road (backstage supporter performance)',
            sourceId: 'XxmWAMAUZpc',
            sourceOffsetSeconds: 0,
            recordingType: 'supporter-performance',
        },
        suppliedLyrics: ['All round the Fields of Anfield Road, where once we watched the King Kenny play...'],
    },
    {
        id: 'liverpool-virgil-van-dijk',
        songbookId: 'dirty_old_town',
        title: 'Virgil van Dijk — Liverpool supporters',
        clubAliases: ['Liverpool'],
        cueKinds: ['goal', 'pressure'],
        playerAliases: ['van dijk'],
        url: '/audio/chants/liverpool-virgil-van-dijk.mp3',
        durationSeconds: 30,
        source: {
            archive: 'manus-skills/chants_audio',
            sourceName: 'Virgil van Dijk song in FULL — Jamie Webster at BOSS Night',
            sourceId: 'TB5tc_XmEeY',
            sourceOffsetSeconds: 0,
            recordingType: 'supporter-performance',
        },
        suppliedLyrics: [
            "He's our centre-half, he's our number four,",
            'Watch him defend and we watch him score,',
            'He can pass the ball, calm as you like,',
            "He's Virgil van Dijk, he's Virgil van Dijk!",
        ],
    },
    {
        id: 'liverpool-si-senor',
        songbookId: 'dale_alegria_a_mi_corazon',
        title: 'Sim Señor — Liverpool supporters',
        clubAliases: ['Liverpool'],
        cueKinds: ['goal'],
        playerAliases: ['firmino'],
        url: '/audio/chants/liverpool-si-senor.mp3',
        durationSeconds: 30,
        source: {
            archive: 'manus-skills/chants_audio',
            sourceName: 'Roberto Firmino — Si Señor',
            sourceId: 'iN8q4axcd0Q',
            sourceOffsetSeconds: 0,
            recordingType: 'terrace',
        },
        suppliedLyrics: [
            "There's something that the Kop wants you to know,",
            'The best in the world his name is Bobby Firmino,',
            'Our number nine,',
            'Give him the ball and he will score every time,',
            'Si Señor, give the ball to Bobby and he will score!',
        ],
    },
    {
        id: 'liverpool-ynwa-live',
        songbookId: 'liverpool_ynwa',
        title: "You'll Never Walk Alone — Liverpool live supporters",
        clubAliases: ['Liverpool'],
        cueKinds: ['kickoff', 'fulltime'],
        url: '/audio/chants/liverpool-ynwa-live.mp3',
        durationSeconds: 30,
        source: {
            archive: 'manus-skills/chants_audio',
            sourceName: "LFC-TV: Gerry Marsden sings You'll Never Walk Alone — Hillsborough memorial",
            sourceId: 'HcBRHYuOr-A',
            sourceOffsetSeconds: 0,
            recordingType: 'supporter-performance',
        },
        suppliedLyrics: ['When you walk through a storm, hold your head up high...'],
    },
    {
        id: 'chelsea-liquidator-stamford-bridge',
        songbookId: 'the_liquidator',
        title: 'The Liquidator — Stamford Bridge crowd',
        clubAliases: ['Chelsea'],
        cueKinds: ['kickoff'],
        url: '/audio/chants/chelsea-liquidator-stamford-bridge.mp3',
        durationSeconds: 30,
        source: {
            archive: 'manus-skills/chants_audio',
            sourceName: 'Before the match Liquidator at Stamford Bridge — Chelsea vs Liverpool 2023–24',
            sourceId: 'XgiLEStsnz0',
            sourceOffsetSeconds: 0,
            recordingType: 'stadium',
        },
    },
    {
        id: 'chelsea-blue-is-the-colour-stamford-bridge',
        songbookId: 'chelsea_blue_is_the_colour',
        title: 'Blue Is the Colour — Stamford Bridge crowd',
        clubAliases: ['Chelsea'],
        cueKinds: ['goal', 'fulltime'],
        url: '/audio/chants/chelsea-blue-is-the-colour-stamford-bridge.mp3',
        durationSeconds: 30,
        source: {
            archive: 'manus-skills/chants_audio',
            sourceName: 'Chelsea vs Manchester City — Blue Is the Colour, Stamford Bridge',
            sourceId: 'HZs0zIA3aUM',
            sourceOffsetSeconds: 0,
            recordingType: 'stadium',
        },
    },
    {
        id: 'juventus-storia-allianz-stadium',
        songbookId: 'storia_di_un_grande_amore',
        title: 'Storia di un Grande Amore — Allianz Stadium crowd',
        clubAliases: ['Juventus'],
        cueKinds: ['kickoff', 'fulltime'],
        url: '/audio/chants/juventus-storia-allianz-stadium.mp3',
        durationSeconds: 30,
        source: {
            archive: 'manus-skills/chants_audio',
            sourceName: 'Inno Juventus Allianz Stadium — Storia di un Grande Amore, 41,507 tifosi live',
            sourceId: 'PpQqLmMP21k',
            sourceOffsetSeconds: 0,
            recordingType: 'stadium',
        },
    },
    {
        id: 'crystal-palace-glad-all-over',
        songbookId: 'glad_all_over',
        title: 'Glad All Over — Crystal Palace supporters',
        clubAliases: ['Crystal Palace', 'Palace'],
        cueKinds: ['goal', 'fulltime'],
        url: '/audio/chants/crystal-palace-glad-all-over.mp3',
        durationSeconds: 30,
        source: {
            archive: 'manus-skills/chants_audio',
            sourceName: 'Glad all over — Palace Fans',
            sourceId: 'vOZ0TYwv0Eg',
            sourceOffsetSeconds: 0,
            recordingType: 'terrace',
        },
    },
    {
        id: 'west-ham-bubbles',
        songbookId: 'forever_blowing_bubbles',
        title: "I'm Forever Blowing Bubbles — West Ham supporters",
        clubAliases: ['West Ham', 'West Ham United'],
        cueKinds: ['kickoff', 'fulltime'],
        url: '/audio/chants/west-ham-bubbles.mp3',
        durationSeconds: 30,
        source: {
            archive: 'manus-skills/chants_audio',
            sourceName: 'West Ham v Sevilla — 60,000 Hammers fans singing Bubbles',
            sourceId: 'NUR8QgYBVX8',
            sourceOffsetSeconds: 0,
            recordingType: 'stadium',
        },
    },
    {
        id: 'napoli-un-giorno-allimprovviso',
        songbookId: 'allez_allez_allez',
        title: "Un giorno all'improvviso — Napoli ultras",
        clubAliases: ['Napoli', 'SSC Napoli'],
        cueKinds: ['kickoff', 'pressure', 'fulltime'],
        url: '/audio/chants/napoli-un-giorno-allimprovviso.mp3',
        durationSeconds: 30,
        source: {
            archive: 'manus-skills/chants_audio',
            sourceName: "Napoli — Un giorno all'improvviso, U'W Chants",
            sourceId: 'kvVGkaz45SM',
            sourceOffsetSeconds: 0,
            recordingType: 'terrace',
        },
    },
    {
        id: 'celtic-just-cant-get-enough',
        songbookId: 'just_cant_get_enough',
        title: "Just Can't Get Enough — Celtic supporters",
        clubAliases: ['Celtic'],
        cueKinds: ['goal', 'pressure', 'fulltime'],
        url: '/audio/chants/celtic-just-cant-get-enough.mp3',
        durationSeconds: 30,
        source: {
            archive: 'manus-skills/chants_audio',
            sourceName: "Just can't Get Enough — Celtic v Rangers",
            sourceId: '4GdV9snm4bs',
            sourceOffsetSeconds: 0,
            recordingType: 'stadium',
        },
    },
    {
        id: 'ac-milan-pioli-is-on-fire',
        songbookId: 'freed_from_desire',
        title: 'Pioli Is on Fire — Milan supporters',
        clubAliases: ['AC Milan', 'Milan'],
        cueKinds: ['goal', 'pressure', 'fulltime'],
        url: '/audio/chants/ac-milan-pioli-is-on-fire.mp3',
        durationSeconds: 30,
        source: {
            archive: 'manus-skills/chants_audio',
            sourceName: 'Milan v Atalanta 2–0 — Pioli is on fire',
            sourceId: 'OOBi1vafrvg',
            sourceOffsetSeconds: 0,
            recordingType: 'stadium',
        },
        suppliedLyrics: ["Pioli's on fire!", "Pioli's on fire!", 'Na-na-na-na-na-na-na-na-na-na-na...'],
    },
    {
        id: 'argentina-muchachos',
        songbookId: 'muchachos',
        title: 'Muchachos — Argentina supporters',
        clubAliases: ['Argentina'],
        cueKinds: ['kickoff', 'goal', 'fulltime'],
        url: '/audio/chants/argentina-muchachos.mp3',
        durationSeconds: 30,
        source: {
            archive: 'manus-skills/chants_audio',
            sourceName: 'Muchachos, ahora nos volvimos a ilusionar',
            sourceId: 'i4t1bGD-j9M',
            sourceOffsetSeconds: 0,
            recordingType: 'terrace',
        },
        suppliedLyrics: ['Muchachos, ahora nos volvimos a ilusionar!'],
    },
    {
        id: 'argentina-decime-que-se-siente',
        songbookId: 'bad_moon_rising',
        title: 'Brasil, decime qué se siente — Argentina supporters',
        clubAliases: ['Argentina'],
        cueKinds: ['pressure'],
        url: '/audio/chants/argentina-decime-que-se-siente.mp3',
        durationSeconds: 30,
        source: {
            archive: 'manus-skills/chants_audio',
            sourceName: 'Brasil decime que se siente — Argentina v Iran, Belo Horizonte',
            sourceId: 'YN1XQTBl5sE',
            sourceOffsetSeconds: 0,
            recordingType: 'stadium',
        },
    },
    {
        id: 'northern-ireland-will-griggs-on-fire',
        songbookId: 'freed_from_desire',
        title: "Will Grigg's on Fire — Northern Ireland supporters",
        clubAliases: ['Northern Ireland'],
        cueKinds: ['goal', 'pressure', 'fulltime'],
        url: '/audio/chants/northern-ireland-will-griggs-on-fire.mp3',
        durationSeconds: 30,
        source: {
            archive: 'manus-skills/chants_audio',
            sourceName: "Will Grigg's on Fire — Northern Ireland fans, Paris Euro 2016",
            sourceId: 'vNf2l9SuHHA',
            sourceOffsetSeconds: 0,
            recordingType: 'terrace',
        },
        suppliedLyrics: [
            "Will Grigg's on fire, your defence is terrified!",
            "Will Grigg's on fire, your defence is terrified!",
            'Na-na-na-na-na-na-na-na-na-na-na...',
        ],
    },
    {
        id: 'galatasaray-askin-olayim',
        songbookId: 'askin_olayim',
        title: 'Aşkın Olayım — Rams Park supporters',
        clubAliases: ['Galatasaray'],
        cueKinds: ['goal', 'fulltime'],
        url: '/audio/chants/galatasaray-askin-olayim.mp3',
        durationSeconds: 22,
        source: {
            archive: 'manus-skills/chants_audio',
            sourceName: "Rams Park'ta Aşkın Olayım çalıyor — Icardi",
            sourceId: 'DTAPQUpKVko',
            sourceOffsetSeconds: 0,
            recordingType: 'stadium',
        },
    },
];

export interface ChantRecordingLookup {
    clubName: string;
    cueKind: AtmosphereCueKind;
    songbookId?: string;
    playerName?: string;
    /** Stable cue id provides rotation without random re-renders. */
    playbackKey: string;
}

/**
 * Returns only a recording belonging to the cue's club. Unknown clubs intentionally get no
 * audio rather than another club's terrace recording or a generated imitation.
 */
export function findChantRecording(input: ChantRecordingLookup): ChantRecording | undefined {
    const clubName = normaliseClub(input.clubName);
    const clubMatches = CHANT_AUDIO_CATALOG.filter(recording =>
        recording.clubAliases.some(alias => normaliseClub(alias) === clubName) && (!recording.playerAliases || recording.playerAliases.some(alias => input.playerName?.toLowerCase().includes(alias))),
    );
    if (clubMatches.length === 0) return undefined;
    if (input.cueKind === 'kickoff' && clubName === 'liverpool') return clubMatches.find(recording => recording.id === 'liverpool-ynwa-live');
    const playerSong = input.cueKind === 'goal' ? clubMatches.find(recording => recording.playerAliases) : undefined;
    if (playerSong) return playerSong;

    const exactSongbookMatches = input.songbookId
        ? clubMatches.filter(recording => recording.songbookId === input.songbookId && recording.cueKinds.includes(input.cueKind))
        : [];
    const cueMatches = clubMatches.filter(recording => recording.cueKinds.includes(input.cueKind));
    const candidates = exactSongbookMatches.length > 0
        ? exactSongbookMatches
        : cueMatches;
    if (!candidates.length) return undefined;

    return candidates[stableHash(input.playbackKey) % candidates.length];
}
