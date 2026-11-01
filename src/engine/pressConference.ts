export type PressResult = 'won' | 'drew' | 'lost';
export type PressQuestionFocus = 'result' | 'tactics' | 'event' | 'table' | 'form' | 'promise';
export type PressAnswerDisposition =
    | 'constructive'
    | 'self-critical'
    | 'defiant'
    | 'blaming'
    | 'evasive'
    | 'refusal'
    | 'nonsense';
export type PressMediaTone = 'positive' | 'negative' | 'neutral' | 'sensationalist';

const MAX_QUESTION_CHARS = 360;
const MAX_ANSWER_CHARS = 1600;
const MAX_ARTICLE_CHARS = 900;
const MAX_HEADLINE_CHARS = 110;
const MAX_EVENTS = 12;
const MAX_RECENT_RESULTS = 5;
const MAX_PLAYERS = 32;
const MAX_PROMISES = 6;

export interface PressFixtureContext {
    fixtureId: string;
    competition: string;
    stage?: string;
    week?: number;
    homeTeam: string;
    awayTeam: string;
    userTeam: string;
    userWasHome: boolean;
    userGoals: number;
    opponentGoals: number;
    result: PressResult;
}

export interface PressEventContext {
    minute: number;
    type: 'goal' | 'sub' | 'injury' | 'card' | 'whistle' | 'commentary';
    teamName?: string;
    player?: string;
    description: string;
    scoreAfter?: string;
}

export interface PressTableContext {
    position?: number;
    teamCount?: number;
    points?: number;
    gapToTarget?: number;
    summary?: string;
}

export interface PressRecentResult {
    opponent: string;
    score: string;
    result: PressResult;
    competition?: string;
}

export interface PressPromiseContext {
    id: string;
    description: string;
    status: 'pending' | 'kept' | 'broken';
    playerInvolved?: string;
    deadlineWeek?: number;
}

export interface PressDerbyContext {
    name: string;
    scrutiny: string;
}

export interface PressConferenceContext {
    /** Stable match/session key, normally fixture.id + the deterministic match session id. */
    sessionId: string;
    fixture: PressFixtureContext;
    formation: string;
    mentality: string;
    tacticalSummary?: string;
    events: PressEventContext[];
    table?: PressTableContext;
    recentResults: PressRecentResult[];
    activePromises: PressPromiseContext[];
    /** Names the model is permitted to reference. */
    validPlayerNames: string[];
    /** Optional verified rivalry context for this exact fixture. */
    derby?: PressDerbyContext;
}

export interface PressGroundingFact {
    id: string;
    label: string;
    questionTerms: string[];
}

export interface PressQuestion {
    id: string;
    journalist: string;
    outlet: string;
    question: string;
    focus: PressQuestionFocus;
    groundingFactIds: string[];
}

export interface PressConferenceSession {
    id: string;
    context: PressConferenceContext;
    questions: PressQuestion[];
}

export interface PressAnswer {
    questionId: string;
    answer: string;
}

export interface PressConferenceEvaluationRequest {
    session: PressConferenceSession;
    answers: PressAnswer[];
    /** Optional caller-owned id. If absent, it is derived from the exact transcript. */
    evaluationId?: string;
}

export interface PressAnswerAssessment {
    questionId: string;
    disposition: PressAnswerDisposition;
    relevance: -2 | -1 | 0 | 1 | 2;
    /** Exact excerpt from the manager answer that supports the reading. */
    evidenceQuote: string;
    explanation: string;
}

export interface PressConferenceReport {
    /** The UI displays this so a real AI result cannot be mistaken for a local fallback. */
    mode: 'ai-editorial';
    evaluationId: string;
    headline: string;
    article: string;
    mediaTone: PressMediaTone;
    reputationChange: number;
    squadFormChange: number;
    newspaperName: string;
    effectRationale: string;
    answerAssessments: PressAnswerAssessment[];
    /** Schema-validated against context.validPlayerNames. */
    playerReferences: string[];
}

export interface PressFailure {
    code: 'AI_GATEWAY_FAILED' | 'AI_RESPONSE_INVALID' | 'PRESS_CONTEXT_INVALID';
    message: string;
    retryable: boolean;
}

export interface PressQuestionGenerationSuccess {
    mode: 'ai-questions';
    provider: string;
    session: PressConferenceSession;
}

export interface PressQuestionGenerationUnavailable {
    mode: 'unavailable';
    provider: string;
    failure: PressFailure;
    context?: PressConferenceContext;
}

export type PressQuestionGenerationResult = PressQuestionGenerationSuccess | PressQuestionGenerationUnavailable;

export interface PressConferenceEvaluationSuccess {
    mode: 'ai-editorial';
    provider: string;
    report: PressConferenceReport;
}

export interface PressConferenceEvaluationUnavailable {
    mode: 'unavailable';
    provider: string;
    failure: PressFailure;
    evaluationId: string;
}

export type PressConferenceEvaluationResult = PressConferenceEvaluationSuccess | PressConferenceEvaluationUnavailable;

export interface PressEffectPlayer {
    name: string;
    isStarter: boolean;
    form?: number;
}

export interface PressEffectState<TPlayer extends PressEffectPlayer = PressEffectPlayer> {
    managerReputation: number;
    players: readonly TPlayer[];
    appliedEvaluationIds?: readonly string[];
}

export interface PressEffectApplication<TPlayer extends PressEffectPlayer = PressEffectPlayer> {
    evaluationId: string;
    applied: boolean;
    managerReputation: number;
    players: TPlayer[];
    appliedEvaluationIds: string[];
    managerReputationDelta: number;
    starterFormDelta: number;
}

export interface PressTeamState<TPlayer extends PressEffectPlayer = PressEffectPlayer> {
    players: readonly TPlayer[];
}

export interface PressConferenceTransitionState<TPlayer extends PressEffectPlayer = PressEffectPlayer, TTeam extends PressTeamState<TPlayer> = PressTeamState<TPlayer>> {
    managerReputation: number;
    teams: Record<string, TTeam>;
    userTeamName: string | null;
    appliedEvaluationIds?: readonly string[];
}

export interface PressConferenceTransition<TPlayer extends PressEffectPlayer = PressEffectPlayer, TTeam extends PressTeamState<TPlayer> = PressTeamState<TPlayer>> {
    applied: boolean;
    managerReputation: number;
    teams: Record<string, TTeam>;
    appliedEvaluationIds: string[];
    effects: PressEffectApplication<TPlayer>;
}

const asString = (value: unknown) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
const boundedText = (value: unknown, max: number) => asString(value).slice(0, max);
const boundedInteger = (value: unknown, min: number, max: number) => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : undefined;
};
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function isObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeDistinctStrings(values: unknown, maxItems: number, maxChars = 90): string[] {
    if (!Array.isArray(values)) return [];
    const seen = new Set<string>();
    return values
        .map(value => boundedText(value, maxChars))
        .filter(value => {
            const key = value.toLocaleLowerCase();
            if (!value || seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, maxItems);
}

function ordinal(value: number) {
    const mod100 = value % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
    if (value % 10 === 1) return `${value}st`;
    if (value % 10 === 2) return `${value}nd`;
    if (value % 10 === 3) return `${value}rd`;
    return `${value}th`;
}

function stableHash(value: string) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
}

function requireText(value: unknown, field: string, max = 140) {
    const result = boundedText(value, max);
    if (!result) throw new Error(`Missing press context field: ${field}`);
    return result;
}

function normalizeResult(value: unknown): PressResult {
    if (value === 'won' || value === 'drew' || value === 'lost') return value;
    throw new Error('Press context result must be won, drew, or lost');
}

const derbyPairs: Array<{ teams: [string, string]; name: string; scrutiny: string }> = [
    { teams: ['arsenal', 'tottenham hotspur'], name: 'North London Derby', scrutiny: 'territorial rivalry; cards and composure are under close scrutiny' },
    { teams: ['liverpool', 'manchester united'], name: 'Northwest Derby', scrutiny: 'historic animosity between England’s two most decorated clubs' },
    { teams: ['manchester city', 'manchester united'], name: 'Manchester Derby', scrutiny: 'city-rival pressure and local bragging rights' },
    { teams: ['liverpool', 'everton'], name: 'Merseyside Derby', scrutiny: 'the fixture’s exceptional red-card history makes discipline newsworthy' },
    { teams: ['newcastle united', 'sunderland'], name: 'Tyne-Wear Derby', scrutiny: 'regional rivalry heightens scrutiny of resolve and identity' },
    { teams: ['real madrid', 'fc barcelona'], name: 'El Clásico', scrutiny: 'a global sporting spectacle with exceptional pressure on the result' },
    { teams: ['real madrid', 'atletico madrid'], name: 'Derbi Madrileño', scrutiny: 'prestige versus working-class defiance intensifies every tactical call' },
    { teams: ['sevilla', 'real betis'], name: 'Derbi Sevillano', scrutiny: 'a volatile city derby where composure is a central story' },
    { teams: ['athletic club', 'real sociedad'], name: 'Basque Derby', scrutiny: 'cultural solidarity and fierce athletic pride shape the reaction' },
    { teams: ['ac milan', 'inter milan'], name: 'Derby della Madonnina', scrutiny: 'shared-stadium history and European pedigree raise the stakes' },
    { teams: ['juventus', 'inter milan'], name: "Derby d'Italia", scrutiny: 'historic tensions make the media response unusually sharp' },
    { teams: ['as roma', 'ss lazio'], name: 'Derby della Capitale', scrutiny: 'an intense capital rivalry with an exceptional atmosphere' },
    { teams: ['celtic', 'rangers'], name: 'Old Firm', scrutiny: 'a high-intensity Glasgow rivalry requiring responsible, non-inflammatory language' },
    { teams: ['bayern munich', 'borussia dortmund'], name: 'Der Klassiker', scrutiny: 'the national rivalry magnifies title-race implications' },
    { teams: ['borussia dortmund', 'schalke 04'], name: 'Revierderby', scrutiny: 'Ruhr Valley industrial rivalry sharpens local scrutiny' },
    { teams: ['paris saint-germain', 'olympique de marseille'], name: 'Le Classique', scrutiny: 'north-versus-south rivalry magnifies the national spotlight' },
    { teams: ['boca juniors', 'river plate'], name: 'Superclásico', scrutiny: 'an exceptionally atmospheric Buenos Aires rivalry raises the pressure' },
];

function canonicalTeamName(team: string) {
    return team.toLocaleLowerCase().replace(/\b(fc|cf)\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Uses only the documented rivalry pairs; unmatched fixtures receive no invented derby narrative. */
export function detectPressDerby(homeTeam: string, awayTeam: string): PressDerbyContext | undefined {
    const home = canonicalTeamName(homeTeam);
    const away = canonicalTeamName(awayTeam);
    const derby = derbyPairs.find(candidate => {
        const [firstRaw, secondRaw] = candidate.teams;
        const first = canonicalTeamName(firstRaw);
        const second = canonicalTeamName(secondRaw);
        return (home === first && away === second) || (home === second && away === first);
    });
    return derby ? { name: derby.name, scrutiny: derby.scrutiny } : undefined;
}

/**
 * Produces a compact, immutable-ish snapshot suitable for prompts and persistence. It deliberately
 * drops excess low-signal events/history instead of silently truncating the match result or answers.
 */
export function normalizePressConferenceContext(input: PressConferenceContext): PressConferenceContext {
    if (!isObject(input) || !isObject(input.fixture)) throw new Error('Missing press fixture context');
    const fixture = input.fixture;
    const homeTeam = requireText(fixture.homeTeam, 'fixture.homeTeam');
    const awayTeam = requireText(fixture.awayTeam, 'fixture.awayTeam');
    const userTeam = requireText(fixture.userTeam, 'fixture.userTeam');
    const userGoals = boundedInteger(fixture.userGoals, 0, 30);
    const opponentGoals = boundedInteger(fixture.opponentGoals, 0, 30);
    if (userGoals === undefined || opponentGoals === undefined) throw new Error('Press context score is invalid');
    if (typeof fixture.userWasHome !== 'boolean') throw new Error('Press context must state home/away');

    const events = (Array.isArray(input.events) ? input.events : [])
        .map((event): PressEventContext | null => {
            if (!isObject(event)) return null;
            const minute = boundedInteger(event.minute, 0, 130);
            const type = event.type;
            const allowedTypes = ['goal', 'sub', 'injury', 'card', 'whistle', 'commentary'] as const;
            if (minute === undefined || !allowedTypes.includes(type as typeof allowedTypes[number])) return null;
            const description = boundedText(event.description, 260);
            if (!description) return null;
            return {
                minute,
                type: type as PressEventContext['type'],
                teamName: boundedText(event.teamName, 90) || undefined,
                player: boundedText(event.player, 90) || undefined,
                description,
                scoreAfter: boundedText(event.scoreAfter, 20) || undefined,
            };
        })
        .filter((event): event is PressEventContext => event !== null)
        .sort((left, right) => {
            const significance = (event: PressEventContext) => event.type === 'goal' ? 0 : event.type === 'card' || event.type === 'injury' ? 1 : 2;
            return significance(left) - significance(right) || left.minute - right.minute;
        })
        .slice(0, MAX_EVENTS)
        .sort((left, right) => left.minute - right.minute);

    const recentResults = (Array.isArray(input.recentResults) ? input.recentResults : [])
        .map((result): PressRecentResult | null => {
            if (!isObject(result)) return null;
            const opponent = boundedText(result.opponent, 90);
            const score = boundedText(result.score, 20);
            const matchResult = result.result;
            if (!opponent || !/^\d{1,2}-\d{1,2}$/.test(score) || !['won', 'drew', 'lost'].includes(matchResult as string)) return null;
            return {
                opponent,
                score,
                result: matchResult as PressResult,
                competition: boundedText(result.competition, 80) || undefined,
            };
        })
        .filter((result): result is PressRecentResult => result !== null)
        .slice(0, MAX_RECENT_RESULTS);

    const activePromises = (Array.isArray(input.activePromises) ? input.activePromises : [])
        .map((promise): PressPromiseContext | null => {
            if (!isObject(promise)) return null;
            const id = boundedText(promise.id, 80);
            const description = boundedText(promise.description, 220);
            const status = promise.status;
            if (!id || !description || !['pending', 'kept', 'broken'].includes(status as string)) return null;
            return {
                id,
                description,
                status: status as PressPromiseContext['status'],
                playerInvolved: boundedText(promise.playerInvolved, 90) || undefined,
                deadlineWeek: boundedInteger(promise.deadlineWeek, 0, 1000),
            };
        })
        .filter((promise): promise is PressPromiseContext => promise !== null)
        .slice(0, MAX_PROMISES);

    const table = isObject(input.table) ? {
        position: boundedInteger(input.table.position, 1, 200),
        teamCount: boundedInteger(input.table.teamCount, 1, 200),
        points: boundedInteger(input.table.points, 0, 1000),
        gapToTarget: boundedInteger(input.table.gapToTarget, -1000, 1000),
        summary: boundedText(input.table.summary, 220) || undefined,
    } : undefined;

    const fixtureId = requireText(fixture.fixtureId, 'fixture.fixtureId', 120);
    const normalizedFixture: PressFixtureContext = {
        fixtureId,
        competition: requireText(fixture.competition, 'fixture.competition', 100),
        stage: boundedText(fixture.stage, 80) || undefined,
        week: boundedInteger(fixture.week, 0, 1000),
        homeTeam,
        awayTeam,
        userTeam,
        userWasHome: fixture.userWasHome,
        userGoals,
        opponentGoals,
        result: normalizeResult(fixture.result),
    };
    const sessionId = boundedText(input.sessionId, 160) || `press-${fixtureId}-${stableHash(`${userTeam}|${userGoals}-${opponentGoals}`)}`;

    return {
        sessionId,
        fixture: normalizedFixture,
        formation: requireText(input.formation, 'formation', 40),
        mentality: requireText(input.mentality, 'mentality', 60),
        tacticalSummary: boundedText(input.tacticalSummary, 360) || undefined,
        events,
        table,
        recentResults,
        activePromises,
        validPlayerNames: normalizeDistinctStrings(input.validPlayerNames, MAX_PLAYERS),
        derby: input.derby && isObject(input.derby) && boundedText(input.derby.name, 100) && boundedText(input.derby.scrutiny, 260)
            ? { name: boundedText(input.derby.name, 100), scrutiny: boundedText(input.derby.scrutiny, 260) }
            : detectPressDerby(homeTeam, awayTeam),
    };
}

export function getPressGroundingFacts(contextInput: PressConferenceContext): PressGroundingFact[] {
    const context = normalizePressConferenceContext(contextInput);
    const fixture = context.fixture;
    const opponent = fixture.userWasHome ? fixture.awayTeam : fixture.homeTeam;
    const facts: PressGroundingFact[] = [
        {
            id: 'fixture',
            label: `Fixture: ${fixture.homeTeam} vs ${fixture.awayTeam}.`,
            questionTerms: [fixture.homeTeam, fixture.awayTeam],
        },
        {
            id: 'scoreline',
            label: `Result for ${fixture.userTeam}: ${fixture.result}, ${fixture.userGoals}-${fixture.opponentGoals} against ${opponent}.`,
            questionTerms: [`${fixture.userGoals}-${fixture.opponentGoals}`, opponent],
        },
        {
            id: 'tactics',
            label: `Manager setup: ${context.formation}, ${context.mentality}.`,
            questionTerms: [context.formation, context.mentality],
        },
    ];

    if (context.table?.position && context.table.teamCount) {
        facts.push({
            id: 'table',
            label: `League table: ${fixture.userTeam} are ${ordinal(context.table.position)} of ${context.table.teamCount}${context.table.points !== undefined ? ` on ${context.table.points} points` : ''}.`,
            questionTerms: [ordinal(context.table.position), `${context.table.position}`, `${context.table.points ?? ''}`].filter(Boolean),
        });
    } else if (context.table?.summary) {
        facts.push({ id: 'table', label: `League table: ${context.table.summary}`, questionTerms: context.table.summary.split(' ').filter(word => word.length > 3).slice(0, 3) });
    }

    context.events.forEach((event, index) => {
        const player = event.player || event.teamName;
        if (!player) return;
        facts.push({
            id: `event-${index + 1}`,
            label: `${event.minute}' ${event.type}: ${event.description}`,
            questionTerms: [player, `${event.minute}`, `${event.minute}'`],
        });
    });

    context.recentResults.forEach((result, index) => {
        facts.push({
            id: `recent-${index + 1}`,
            label: `Recent result: ${result.result} ${result.score} against ${result.opponent}${result.competition ? ` in ${result.competition}` : ''}.`,
            questionTerms: [result.opponent, result.score],
        });
    });

    context.activePromises.forEach((promise, index) => {
        const meaningfulWords = promise.description.split(/\s+/).filter(word => word.length > 4).slice(0, 2);
        facts.push({
            id: `promise-${index + 1}`,
            label: `Promise (${promise.status}): ${promise.description}${promise.playerInvolved ? `; player: ${promise.playerInvolved}` : ''}.`,
            questionTerms: [promise.playerInvolved || '', ...meaningfulWords].filter(Boolean),
        });
    });

    if (context.derby) {
        facts.push({
            id: 'derby',
            label: `${context.derby.name}: ${context.derby.scrutiny}.`,
            questionTerms: [context.derby.name, context.fixture.homeTeam, context.fixture.awayTeam],
        });
    }

    return facts.slice(0, 24);
}

export function buildPressQuestionPrompt(contextInput: PressConferenceContext) {
    const context = normalizePressConferenceContext(contextInput);
    const groundingFacts = getPressGroundingFacts(context);
    const allowedPlayers = context.validPlayerNames.length ? context.validPlayerNames.join(', ') : 'No named player is available for a question.';
    const thirdFocus = context.events.some(event => event.player) ? 'event' : context.activePromises.length ? 'promise' : context.table ? 'table' : 'form';
    return `REQUIRED QUESTION ORDER: question 1 focus is result and asks about the score; question 2 focus is tactics and asks about the setup; question 3 focus is ${thirdFocus} and names a different supplied fact. Never repeat a focus.\nYou are a sharp post-match football journalist. Generate exactly three distinct questions for a manager.\n\nMATCH SNAPSHOT (the only source of truth):\n${groundingFacts.map(fact => `- [${fact.id}] ${fact.label}`).join('\n')}\n\nAllowed player names: ${allowedPlayers}\n\nRules:\n- Every question must cite at least one matching groundingFactId and name a concrete fact from it in the question itself.\n- Across the three questions, cover three different angles where the snapshot permits it (result/tactics/event/table/form/promise).\n- Ask about this fixture, not generic preparation, motivation, or fans.\n- Use a player name only when it appears exactly in Allowed player names. Never invent a player, an event, a score, or a standing.\n- Keep each question below ${MAX_QUESTION_CHARS} characters and make it answerable by the manager.\n- Return JSON only.\n\nRequired JSON:\n{\n  "questions": [\n    {"journalist":"string","outlet":"string","question":"string","focus":"result|tactics|event|table|form|promise","groundingFactIds":["fact-id"]}\n  ]\n}`;
}

function hasGroundedTerm(question: string, fact: PressGroundingFact) {
    const lowerQuestion = question.toLocaleLowerCase();
    return fact.questionTerms.some(term => term && lowerQuestion.includes(term.toLocaleLowerCase()));
}

/** Rejects malformed/generic model questions instead of replacing them with fake local questions. */
export function normalizePressQuestions(contextInput: PressConferenceContext, payload: unknown): PressQuestion[] {
    const context = normalizePressConferenceContext(contextInput);
    if (!isObject(payload) || !Array.isArray(payload.questions) || payload.questions.length !== 3) {
        throw new Error('Expected exactly three press questions');
    }
    const facts = getPressGroundingFacts(context);
    const factMap = new Map(facts.map(fact => [fact.id, fact]));
    const allowedFocuses: PressQuestionFocus[] = ['result', 'tactics', 'event', 'table', 'form', 'promise'];
    const seenQuestionText = new Set<string>();
    const seenFocuses = new Set<string>();

    return payload.questions.map((raw, index) => {
        if (!isObject(raw)) throw new Error(`Question ${index + 1} is not an object`);
        const journalist = boundedText(raw.journalist, 80);
        const outlet = boundedText(raw.outlet, 80);
        const question = boundedText(raw.question, MAX_QUESTION_CHARS);
        const focus = raw.focus;
        const groundingFactIds = normalizeDistinctStrings(raw.groundingFactIds, 3, 50);
        if (!journalist || !outlet || !question || !question.endsWith('?')) {
            throw new Error(`Question ${index + 1} has invalid display fields`);
        }
        if (!allowedFocuses.includes(focus as PressQuestionFocus) || seenFocuses.has(focus as string)) {
            throw new Error(`Question ${index + 1} has an invalid or duplicate focus`);
        }
        if (!groundingFactIds.length || groundingFactIds.some(id => !factMap.has(id))) {
            throw new Error(`Question ${index + 1} has invalid grounding facts`);
        }
        if (!groundingFactIds.some(id => hasGroundedTerm(question, factMap.get(id)!))) {
            throw new Error(`Question ${index + 1} does not name a cited match fact`);
        }
        const key = question.toLocaleLowerCase();
        if (seenQuestionText.has(key)) throw new Error(`Question ${index + 1} duplicates another question`);
        seenQuestionText.add(key);
        seenFocuses.add(focus as string);
        return {
            id: `${context.sessionId}:q${index + 1}`,
            journalist,
            outlet,
            question,
            focus: focus as PressQuestionFocus,
            groundingFactIds,
        };
    });
}

export function normalizePressAnswers(sessionInput: PressConferenceSession, answers: PressAnswer[]): PressAnswer[] {
    const session = normalizePressConferenceSession(sessionInput);
    if (!Array.isArray(answers) || answers.length !== session.questions.length) {
        throw new Error('Every press question requires exactly one answer');
    }
    const answerMap = new Map<string, string>();
    answers.forEach(raw => {
        if (!isObject(raw)) throw new Error('Press answer is invalid');
        const questionId = boundedText(raw.questionId, 220);
        const answer = asString(raw.answer);
        if (!questionId || !answer || answer.length > MAX_ANSWER_CHARS || answerMap.has(questionId)) {
            throw new Error('Press answer is empty, too long, or duplicated');
        }
        answerMap.set(questionId, answer);
    });
    return session.questions.map(question => {
        const answer = answerMap.get(question.id);
        if (!answer) throw new Error('An answer does not match the current press session');
        return { questionId: question.id, answer };
    });
}

export function normalizePressConferenceSession(input: PressConferenceSession): PressConferenceSession {
    if (!isObject(input)) throw new Error('Invalid press session');
    const context = normalizePressConferenceContext(input.context);
    if (!Array.isArray(input.questions) || input.questions.length !== 3) throw new Error('Press session needs three questions');
    const expectedIds = new Set(input.questions.map(question => question?.id));
    if (expectedIds.size !== 3 || [...expectedIds].some(id => typeof id !== 'string' || !id.startsWith(`${context.sessionId}:q`))) {
        throw new Error('Press question ids do not belong to this session');
    }
    return {
        id: boundedText(input.id, 160) || context.sessionId,
        context,
        questions: input.questions.map(question => ({
            id: requireText(question.id, 'question.id', 220),
            journalist: requireText(question.journalist, 'question.journalist', 80),
            outlet: requireText(question.outlet, 'question.outlet', 80),
            question: requireText(question.question, 'question.question', MAX_QUESTION_CHARS),
            focus: question.focus,
            groundingFactIds: normalizeDistinctStrings(question.groundingFactIds, 3, 50),
        })),
    };
}

export function createPressEvaluationId(sessionInput: PressConferenceSession, answers: PressAnswer[]) {
    const session = normalizePressConferenceSession(sessionInput);
    const normalizedAnswers = normalizePressAnswers(session, answers);
    return `press-eval-${stableHash(`${session.id}|${normalizedAnswers.map(answer => `${answer.questionId}:${answer.answer}`).join('|')}`)}`;
}

export function normalizePressEvaluationRequest(input: PressConferenceEvaluationRequest): Required<PressConferenceEvaluationRequest> {
    if (!isObject(input)) throw new Error('Invalid press evaluation request');
    const session = normalizePressConferenceSession(input.session as PressConferenceSession);
    const answers = normalizePressAnswers(session, input.answers as PressAnswer[]);
    const evaluationId = boundedText(input.evaluationId, 160) || createPressEvaluationId(session, answers);
    return { session, answers, evaluationId };
}

export function buildPressEvaluationPrompt(requestInput: PressConferenceEvaluationRequest) {
    const request = normalizePressEvaluationRequest(requestInput);
    const context = request.session.context;
    const facts = getPressGroundingFacts(context);
    const transcript = request.session.questions.map(question => {
        const answer = request.answers.find(candidate => candidate.questionId === question.id)!;
        return `Question ID: ${question.id}\nJournalist (${question.outlet}): ${question.question}\nManager answer: ${JSON.stringify(answer.answer)}`;
    }).join('\n\n');

    return `You are the sports editor publishing the post-match editorial below. Evaluate the manager's actual words, not a bag of positive or negative keywords.\n\nMATCH SNAPSHOT:\n${facts.map(fact => `- [${fact.id}] ${fact.label}`).join('\n')}\nAllowed player names: ${context.validPlayerNames.length ? context.validPlayerNames.join(', ') : 'none'}\n\nTRANSCRIPT:\n${transcript}\n\nEditorial rules:\n- Assess every answer separately. evidenceQuote must be an exact, short excerpt of that answer.\n- Use disposition "constructive" or "self-critical" when the answer directly addresses the question with a credible explanation; "defiant" can still be relevant when it explains a disagreement.\n- Use "blaming" for public blame, "evasive" for dodging, "refusal" for declining to answer, and "nonsense" for unrelated/gibberish.\n- Do not reward refusal, evasiveness, or nonsense with a positive reputation or squad-form effect. A direct negation with evidence is not automatically evasive.\n- Criticising named players can reduce squad form; taking responsibility can protect it. Effects must follow the transcript and may be negative, zero, or positive.\n- article must be 2-4 concise sentences, grounded in the snapshot and transcript, with no invented facts or player names.\n- playerReferences may contain only exact names from Allowed player names.\n- reputationChange must be an integer from -8 to 8; squadFormChange must be an integer from -4 to 4.\n- headline must be at most 12 words. Return JSON only.\n\nRequired JSON:\n{\n  "headline":"string",\n  "article":"string",\n  "mediaTone":"positive|negative|neutral|sensationalist",\n  "reputationChange":0,\n  "squadFormChange":0,\n  "newspaperName":"string",\n  "effectRationale":"string",\n  "answerAssessments":[{"questionId":"string","disposition":"constructive|self-critical|defiant|blaming|evasive|refusal|nonsense","relevance":-2,"evidenceQuote":"exact excerpt","explanation":"string"}],\n  "playerReferences":["exact allowed player name"]\n}`;
}

function normalizeRelevance(value: unknown): PressAnswerAssessment['relevance'] {
    if (value === -2 || value === -1 || value === 0 || value === 1 || value === 2) return value;
    throw new Error('Answer relevance must be an integer from -2 to 2');
}

function includesNormalized(haystack: string, needle: string) {
    return asString(haystack).toLocaleLowerCase().includes(asString(needle).toLocaleLowerCase());
}

/**
 * Validates the model's bounded schema and preserves semantic assessment from the model. The only
 * deterministic adjustment is a guard against an unsupported positive reward when all answers are
 * explicitly classified by the model as refusal/evasion/nonsense.
 */
export function normalizePressReport(requestInput: PressConferenceEvaluationRequest, payload: unknown): PressConferenceReport {
    const request = normalizePressEvaluationRequest(requestInput);
    if (!isObject(payload)) throw new Error('Editorial response is not an object');
    const headline = boundedText(payload.headline, MAX_HEADLINE_CHARS);
    const article = boundedText(payload.article, MAX_ARTICLE_CHARS);
    const newspaperName = boundedText(payload.newspaperName, 100);
    const effectRationale = boundedText(payload.effectRationale, 320);
    const mediaTone = payload.mediaTone;
    const reputationChange = boundedInteger(payload.reputationChange, -8, 8);
    const squadFormChange = boundedInteger(payload.squadFormChange, -4, 4);
    const tones: PressMediaTone[] = ['positive', 'negative', 'neutral', 'sensationalist'];
    if (!headline || !article || !newspaperName || !effectRationale || !tones.includes(mediaTone as PressMediaTone)
        || reputationChange === undefined || squadFormChange === undefined) {
        throw new Error('Editorial response has invalid bounded fields');
    }

    if (!Array.isArray(payload.answerAssessments) || payload.answerAssessments.length !== request.answers.length) {
        throw new Error('Editorial must assess every manager answer');
    }
    const answerById = new Map(request.answers.map(answer => [answer.questionId, answer.answer]));
    const dispositions: PressAnswerDisposition[] = ['constructive', 'self-critical', 'defiant', 'blaming', 'evasive', 'refusal', 'nonsense'];
    const seenAssessments = new Set<string>();
    const answerAssessments = payload.answerAssessments.map((raw, index): PressAnswerAssessment => {
        if (!isObject(raw)) throw new Error(`Answer assessment ${index + 1} is invalid`);
        const questionId = boundedText(raw.questionId, 220);
        const disposition = raw.disposition;
        const evidenceQuote = boundedText(raw.evidenceQuote, 260);
        const explanation = boundedText(raw.explanation, 300);
        const sourceAnswer = answerById.get(questionId);
        if (!sourceAnswer || seenAssessments.has(questionId) || !dispositions.includes(disposition as PressAnswerDisposition)
            || !evidenceQuote || !explanation || !includesNormalized(sourceAnswer, evidenceQuote)) {
            throw new Error(`Answer assessment ${index + 1} is not grounded in the transcript`);
        }
        seenAssessments.add(questionId);
        return {
            questionId,
            disposition: disposition as PressAnswerDisposition,
            relevance: normalizeRelevance(raw.relevance),
            evidenceQuote,
            explanation,
        };
    });
    if (seenAssessments.size !== request.answers.length) throw new Error('Editorial answer assessments are incomplete');

    const allowedPlayers = new Map(request.session.context.validPlayerNames.map(name => [name.toLocaleLowerCase(), name]));
    const rawReferences = normalizeDistinctStrings(payload.playerReferences, 6, 90);
    if (rawReferences.some(reference => !allowedPlayers.has(reference.toLocaleLowerCase()))) {
        throw new Error('Editorial referenced a player outside the match context');
    }
    const playerReferences = rawReferences.map(reference => allowedPlayers.get(reference.toLocaleLowerCase())!);

    const nonSubstantive = new Set<PressAnswerDisposition>(['evasive', 'refusal', 'nonsense']);
    const noRelevantContent = answerAssessments.every(assessment => nonSubstantive.has(assessment.disposition) || assessment.relevance <= 0);
    // A malformed, refused, or irrelevant transcript receives an explicit neutral result, rather
    // than an arbitrary reward or a keyword-derived punishment. The answer assessments remain
    // visible to explain why no gameplay effect was applied.
    const guardedReputationChange = noRelevantContent ? 0 : reputationChange;
    const guardedSquadFormChange = noRelevantContent ? 0 : squadFormChange;
    const guardedTone: PressMediaTone = noRelevantContent ? 'neutral' : mediaTone as PressMediaTone;

    return {
        mode: 'ai-editorial',
        evaluationId: request.evaluationId,
        headline,
        article,
        mediaTone: guardedTone,
        reputationChange: guardedReputationChange,
        squadFormChange: guardedSquadFormChange,
        newspaperName,
        effectRationale,
        answerAssessments,
        playerReferences,
    };
}

/** Pure, serializable state transition. Re-applying the same evaluation is a no-op. */
export function applyPressConferenceEffects<TPlayer extends PressEffectPlayer>(
    state: PressEffectState<TPlayer>,
    report: Pick<PressConferenceReport, 'evaluationId' | 'reputationChange' | 'squadFormChange'>,
): PressEffectApplication<TPlayer> {
    const appliedEvaluationIds = normalizeDistinctStrings(state.appliedEvaluationIds, 1000, 160);
    if (appliedEvaluationIds.includes(report.evaluationId)) {
        return {
            evaluationId: report.evaluationId,
            applied: false,
            managerReputation: state.managerReputation,
            players: [...state.players],
            appliedEvaluationIds,
            managerReputationDelta: 0,
            starterFormDelta: 0,
        };
    }
    const nextReputation = clamp(state.managerReputation + report.reputationChange, 0, 100);
    const players = state.players.map(player => {
        if (!player.isStarter) return { ...player };
        return { ...player, form: clamp((player.form ?? 50) + report.squadFormChange, 0, 100) };
    }) as TPlayer[];
    return {
        evaluationId: report.evaluationId,
        applied: true,
        managerReputation: nextReputation,
        players,
        appliedEvaluationIds: [...appliedEvaluationIds, report.evaluationId],
        managerReputationDelta: nextReputation - state.managerReputation,
        starterFormDelta: report.squadFormChange,
    };
}

/**
 * Immutable one-shot transition for App: it returns a complete post-press team snapshot that must
 * be supplied to the next-week simulation, avoiding React's stale-closure overwrite race.
 */
export function applyPressConferenceTransition<TPlayer extends PressEffectPlayer, TTeam extends PressTeamState<TPlayer>>(
    state: PressConferenceTransitionState<TPlayer, TTeam>,
    report: Pick<PressConferenceReport, 'evaluationId' | 'reputationChange' | 'squadFormChange'>,
): PressConferenceTransition<TPlayer, TTeam> {
    const userTeam = state.userTeamName ? state.teams[state.userTeamName] : undefined;
    const effects = applyPressConferenceEffects({
        managerReputation: state.managerReputation,
        players: userTeam?.players || [],
        appliedEvaluationIds: state.appliedEvaluationIds,
    }, report);
    if (!userTeam || !state.userTeamName || !effects.applied) {
        return {
            applied: false,
            managerReputation: state.managerReputation,
            teams: { ...state.teams },
            appliedEvaluationIds: effects.appliedEvaluationIds,
            effects,
        };
    }
    return {
        applied: true,
        managerReputation: effects.managerReputation,
        teams: {
            ...state.teams,
            [state.userTeamName]: { ...userTeam, players: effects.players } as TTeam,
        },
        appliedEvaluationIds: effects.appliedEvaluationIds,
        effects,
    };
}

/** Compatibility adapter only; it does not manufacture questions or editorials. */
export function createLegacyPressSession(questions: string[], resultContext: string): PressConferenceSession | null {
    const score = resultContext.match(/(\d{1,2})-(\d{1,2})/);
    const teams = resultContext.match(/^\s*(.*?)\s+just\s+(?:won|drew|lost).*?(?:against|vs)\s+(.*?)\s*(?:with|$)/i);
    if (!Array.isArray(questions) || questions.length !== 3 || !score || !teams) return null;
    const userTeam = boundedText(teams[1], 90);
    const opponent = boundedText(teams[2], 90);
    const lower = resultContext.toLocaleLowerCase();
    const result: PressResult = /\bwon\b/.test(lower) ? 'won' : /\blost\b/.test(lower) ? 'lost' : 'drew';
    if (!userTeam || !opponent) return null;
    const context = normalizePressConferenceContext({
        sessionId: `legacy-${stableHash(resultContext)}`,
        fixture: {
            fixtureId: `legacy-${stableHash(resultContext)}`,
            competition: 'League',
            homeTeam: userTeam,
            awayTeam: opponent,
            userTeam,
            userWasHome: true,
            userGoals: Number(score[1]),
            opponentGoals: Number(score[2]),
            result,
        },
        formation: 'Unspecified',
        mentality: 'Unspecified',
        events: [],
        recentResults: [],
        activePromises: [],
        validPlayerNames: [],
    });
    return {
        id: context.sessionId,
        context,
        questions: questions.map((question, index) => ({
            id: `${context.sessionId}:q${index + 1}`,
            journalist: 'Match Reporter',
            outlet: 'Post-Match Desk',
            question: boundedText(question, MAX_QUESTION_CHARS),
            focus: (['result', 'tactics', 'form'] as PressQuestionFocus[])[index],
            groundingFactIds: ['scoreline'],
        })),
    };
}

export const PRESS_RESPONSE_SCHEMAS = {
    questions: {
        type: 'object',
        additionalProperties: false,
        required: ['questions'],
        properties: {
            questions: {
                type: 'array', minItems: 3, maxItems: 3,
                items: {
                    type: 'object', additionalProperties: false,
                    required: ['journalist', 'outlet', 'question', 'focus', 'groundingFactIds'],
                    properties: {
                        journalist: { type: 'string', maxLength: 80 },
                        outlet: { type: 'string', maxLength: 80 },
                        question: { type: 'string', maxLength: MAX_QUESTION_CHARS },
                        focus: { type: 'string', enum: ['result', 'tactics', 'event', 'table', 'form', 'promise'] },
                        groundingFactIds: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string', maxLength: 50 } },
                    },
                },
            },
        },
    },
    editorial: {
        type: 'object', additionalProperties: false,
        required: ['headline', 'article', 'mediaTone', 'reputationChange', 'squadFormChange', 'newspaperName', 'effectRationale', 'answerAssessments', 'playerReferences'],
        properties: {
            headline: { type: 'string', maxLength: MAX_HEADLINE_CHARS },
            article: { type: 'string', maxLength: MAX_ARTICLE_CHARS },
            mediaTone: { type: 'string', enum: ['positive', 'negative', 'neutral', 'sensationalist'] },
            reputationChange: { type: 'integer', minimum: -8, maximum: 8 },
            squadFormChange: { type: 'integer', minimum: -4, maximum: 4 },
            newspaperName: { type: 'string', maxLength: 100 },
            effectRationale: { type: 'string', maxLength: 320 },
            answerAssessments: {
                type: 'array', minItems: 3, maxItems: 3,
                items: {
                    type: 'object', additionalProperties: false,
                    required: ['questionId', 'disposition', 'relevance', 'evidenceQuote', 'explanation'],
                    properties: {
                        questionId: { type: 'string', maxLength: 220 },
                        disposition: { type: 'string', enum: ['constructive', 'self-critical', 'defiant', 'blaming', 'evasive', 'refusal', 'nonsense'] },
                        relevance: { type: 'integer', minimum: -2, maximum: 2 },
                        evidenceQuote: { type: 'string', maxLength: 260 },
                        explanation: { type: 'string', maxLength: 300 },
                    },
                },
            },
            playerReferences: { type: 'array', maxItems: 6, items: { type: 'string', maxLength: 90 } },
        },
    },
} as const;

export const PRESS_LIMITS = { maxAnswerChars: MAX_ANSWER_CHARS } as const;
