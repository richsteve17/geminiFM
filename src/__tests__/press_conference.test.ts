import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    evaluatePressConference,
    generatePressConferenceQuestions,
} from '../services/geminiService';
import {
    applyPressConferenceEffects,
    applyPressConferenceTransition,
    normalizePressQuestions,
    type PressConferenceContext,
    type PressConferenceSession,
} from '../engine/pressConference';

const context: PressConferenceContext = {
    sessionId: 'fixture-42-match-7',
    fixture: {
        fixtureId: 'fixture-42',
        competition: 'Premier League',
        week: 24,
        homeTeam: 'Arsenal',
        awayTeam: 'Tottenham Hotspur',
        userTeam: 'Arsenal',
        userWasHome: true,
        userGoals: 1,
        opponentGoals: 2,
        result: 'lost',
    },
    formation: '4-3-3',
    mentality: 'Attacking',
    tacticalSummary: 'Arsenal controlled the ball but conceded after a late red card.',
    events: [
        { minute: 17, type: 'goal', teamName: 'Arsenal', player: 'Milo Vega', description: 'Milo Vega scored from a cut-back.', scoreAfter: '1-0' },
        { minute: 78, type: 'card', teamName: 'Arsenal', player: 'Noah Stone', description: 'Noah Stone was sent off for a second yellow.', scoreAfter: '1-1' },
        { minute: 89, type: 'goal', teamName: 'Tottenham Hotspur', player: 'Kai Moss', description: 'Kai Moss scored the winner after the dismissal.', scoreAfter: '1-2' },
    ],
    table: { position: 4, teamCount: 20, points: 48, gapToTarget: 2 },
    recentResults: [
        { opponent: 'Chelsea', score: '2-0', result: 'won', competition: 'Premier League' },
        { opponent: 'Liverpool', score: '1-1', result: 'drew', competition: 'Premier League' },
    ],
    activePromises: [{ id: 'promise-captain', description: 'Keep Noah Stone involved as captain.', status: 'pending', playerInvolved: 'Noah Stone', deadlineWeek: 30 }],
    validPlayerNames: ['Milo Vega', 'Noah Stone'],
};

const questionPayload = {
    questions: [
        {
            journalist: 'Dana Fox',
            outlet: 'North Bank Report',
            question: 'How much did Noah Stone’s 78th-minute dismissal change Arsenal’s 1-2 defeat?',
            focus: 'event',
            groundingFactIds: ['event-2', 'scoreline'],
        },
        {
            journalist: 'Ira Cole',
            outlet: 'Table Watch',
            question: 'With Arsenal fourth on 48 points, how damaging is this 1-2 result to the target?',
            focus: 'table',
            groundingFactIds: ['table', 'scoreline'],
        },
        {
            journalist: 'Sam Reid',
            outlet: 'Tactics Board',
            question: 'Why did the 4-3-3 leave Arsenal exposed after the red card?',
            focus: 'tactics',
            groundingFactIds: ['tactics', 'event-2'],
        },
    ],
};

const makeSession = (): PressConferenceSession => ({
    id: context.sessionId,
    context,
    questions: normalizePressQuestions(context, questionPayload),
});

const response = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('press conference AI contracts', () => {
    it('sends exact fixture, event, table, form, promise, and derby context to the allow-listed gateway model', async () => {
        const fetchMock = vi.fn().mockResolvedValue(response({ text: JSON.stringify(questionPayload) }));
        vi.stubGlobal('fetch', fetchMock);

        const result = await generatePressConferenceQuestions(context);

        expect(result.mode).toBe('ai-questions');
        if (result.mode !== 'ai-questions') return;
        expect(result.session.questions).toHaveLength(3);
        expect(result.session.questions.map(question => question.question)).not.toContain('What are your thoughts on the match?');
        expect(result.session.questions[0].groundingFactIds).toEqual(['event-2', 'scoreline']);

        const request = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
        const prompt = request.contents[0].parts[0].text as string;
        expect(request.model).toBe('gemini-2.5-flash');
        expect(request.config.maxOutputTokens).toBe(1024);
        expect(request.config.responseJsonSchema.properties.questions.minItems).toBe(3);
        expect(prompt).toContain('Arsenal vs Tottenham Hotspur');
        expect(prompt).toContain('Noah Stone was sent off');
        expect(prompt).toContain('4th of 20 on 48 points');
        expect(prompt).toContain('Recent result: won 2-0 against Chelsea');
        expect(prompt).toContain('North London Derby');
        expect(prompt).toContain('Keep Noah Stone involved as captain');
    });

    it('passes exact free-text answers to the AI and preserves a different AI assessment/effect outcome', async () => {
        const session = makeSession();
        const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
            const request = JSON.parse(init.body as string);
            const prompt = request.contents[0].parts[0].text as string;
            const blamesMilo = prompt.includes('Milo Vega let us down and cost us the derby.');
            const payload = blamesMilo
                ? {
                    headline: 'Manager Targets Vega After Derby Loss',
                    article: 'The manager blamed Milo Vega after Arsenal’s 1-2 defeat. The remarks overshadowed the red card and invited scrutiny.',
                    mediaTone: 'sensationalist',
                    reputationChange: -3,
                    squadFormChange: -2,
                    newspaperName: 'North Bank Report',
                    effectRationale: 'Public player blame after a derby loss damaged the dressing-room mood.',
                    answerAssessments: session.questions.map(question => ({
                        questionId: question.id,
                        disposition: question.id.endsWith('q1') ? 'blaming' : 'evasive',
                        relevance: question.id.endsWith('q1') ? 2 : 0,
                        evidenceQuote: question.id.endsWith('q1') ? 'Milo Vega let us down and cost us the derby.' : 'No comment.',
                        explanation: question.id.endsWith('q1') ? 'The answer directs responsibility at a named teammate.' : 'The answer avoided the question.',
                    })),
                    playerReferences: ['Milo Vega'],
                }
                : {
                    headline: 'Manager Owns Derby Defeat',
                    article: 'The manager accepted responsibility for Arsenal’s 1-2 defeat and addressed the late dismissal. The response kept attention on the collective correction.',
                    mediaTone: 'positive',
                    reputationChange: 2,
                    squadFormChange: 1,
                    newspaperName: 'North Bank Report',
                    effectRationale: 'Direct accountability and a specific response protected squad confidence.',
                    answerAssessments: session.questions.map(question => ({
                        questionId: question.id,
                        disposition: question.id.endsWith('q1') ? 'self-critical' : 'constructive',
                        relevance: 2,
                        evidenceQuote: question.id.endsWith('q1') ? 'I take responsibility for the shape after Noah Stone’s red card.' : 'We will review the spacing and respond together.',
                        explanation: 'The manager addressed the match fact and kept responsibility collective.',
                    })),
                    playerReferences: ['Noah Stone'],
                };
            return response({ text: JSON.stringify(payload) });
        });
        vi.stubGlobal('fetch', fetchMock);

        const accountable = await evaluatePressConference({
            session,
            answers: session.questions.map((question, index) => ({
                questionId: question.id,
                answer: index === 0
                    ? 'I take responsibility for the shape after Noah Stone’s red card.'
                    : 'We will review the spacing and respond together.',
            })),
        });
        const blaming = await evaluatePressConference({
            session,
            answers: session.questions.map((question, index) => ({
                questionId: question.id,
                answer: index === 0 ? 'Milo Vega let us down and cost us the derby.' : 'No comment.',
            })),
        });

        expect(accountable.mode).toBe('ai-editorial');
        expect(blaming.mode).toBe('ai-editorial');
        if (accountable.mode !== 'ai-editorial' || blaming.mode !== 'ai-editorial') return;
        expect(accountable.report.reputationChange).toBe(2);
        expect(blaming.report.reputationChange).toBe(-3);
        expect(accountable.report.squadFormChange).toBe(1);
        expect(blaming.report.squadFormChange).toBe(-2);
        expect(blaming.report.playerReferences).toEqual(['Milo Vega']);
        expect(accountable.report.evaluationId).not.toBe(blaming.report.evaluationId);

        const accountableRequest = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
        const accountabilityPrompt = accountableRequest.contents[0].parts[0].text as string;
        expect(accountabilityPrompt).toContain('I take responsibility for the shape after Noah Stone’s red card.');
        expect(accountabilityPrompt).toContain('Noah Stone’s 78th-minute dismissal');
        expect(accountableRequest.config.maxOutputTokens).toBe(2048);
    });

    it('normalizes all-refusal or irrelevant AI assessments to a visible neutral/no-effect outcome', async () => {
        const session = makeSession();
        const fetchMock = vi.fn().mockResolvedValue(response({
            text: JSON.stringify({
                headline: 'Manager Refuses To Engage',
                article: 'The manager repeatedly declined to discuss Arsenal’s defeat. The exchange produced little useful explanation.',
                mediaTone: 'positive',
                reputationChange: 4,
                squadFormChange: 3,
                newspaperName: 'North Bank Report',
                effectRationale: 'The manager declined every substantive answer.',
                answerAssessments: session.questions.map(question => ({
                    questionId: question.id,
                    disposition: 'refusal',
                    relevance: 0,
                    evidenceQuote: 'No comment.',
                    explanation: 'The manager declined to answer.',
                })),
                playerReferences: [],
            }),
        }));
        vi.stubGlobal('fetch', fetchMock);

        const result = await evaluatePressConference({
            session,
            answers: session.questions.map(question => ({ questionId: question.id, answer: 'No comment.' })),
        });

        expect(result.mode).toBe('ai-editorial');
        if (result.mode !== 'ai-editorial') return;
        expect(result.report.mediaTone).toBe('neutral');
        expect(result.report.reputationChange).toBe(0);
        expect(result.report.squadFormChange).toBe(0);
        expect(result.report.answerAssessments.every(assessment => assessment.disposition === 'refusal')).toBe(true);
    });

    it('rejects an editorial that references a player outside the exact supplied squad', async () => {
        const session = makeSession();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({
            text: JSON.stringify({
                headline: 'Manager Names A Culprit',
                article: 'The manager addressed Arsenal’s 1-2 defeat after the derby.',
                mediaTone: 'negative',
                reputationChange: -2,
                squadFormChange: -1,
                newspaperName: 'North Bank Report',
                effectRationale: 'A named-player criticism invited a dressing-room response.',
                answerAssessments: session.questions.map(question => ({
                    questionId: question.id,
                    disposition: 'blaming',
                    relevance: 1,
                    evidenceQuote: 'The responsibility is clear.',
                    explanation: 'The answer blamed an individual.',
                })),
                playerReferences: ['Fictional Striker'],
            }),
        })));

        const result = await evaluatePressConference({
            session,
            answers: session.questions.map(question => ({ questionId: question.id, answer: 'The responsibility is clear.' })),
        });

        expect(result).toMatchObject({ mode: 'unavailable', failure: { code: 'AI_RESPONSE_INVALID' } });
    });

    it('does not fabricate questions when the gateway returns malformed structured output', async () => {
        const fetchMock = vi.fn().mockImplementation(async () => response({ text: JSON.stringify({ questions: questionPayload.questions.slice(0, 2) }) }));
        vi.stubGlobal('fetch', fetchMock);

        const result = await generatePressConferenceQuestions(context);

        expect(result).toMatchObject({ mode: 'unavailable', failure: { code: 'AI_RESPONSE_INVALID' } });
        if (result.mode === 'unavailable') expect(result).not.toHaveProperty('session');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('applies a report exactly once, immutably, on the canonical 0–100 form scale', () => {
        const report = {
            evaluationId: 'press-eval-once',
            reputationChange: 3,
            squadFormChange: 2,
        };
        const state = {
            managerReputation: 99,
            players: [
                { name: 'Starter', isStarter: true, form: 99 },
                { name: 'Bench', isStarter: false, form: 42 },
            ],
            appliedEvaluationIds: [],
        };

        const first = applyPressConferenceEffects(state, report);
        const second = applyPressConferenceEffects({
            managerReputation: first.managerReputation,
            players: first.players,
            appliedEvaluationIds: first.appliedEvaluationIds,
        }, report);

        expect(first.applied).toBe(true);
        expect(first.managerReputation).toBe(100);
        expect(first.managerReputationDelta).toBe(1);
        expect(first.players).toEqual([
            { name: 'Starter', isStarter: true, form: 100 },
            { name: 'Bench', isStarter: false, form: 42 },
        ]);
        expect(state.players[0].form).toBe(99);
        expect(second.applied).toBe(false);
        expect(second.managerReputation).toBe(100);
        expect(second.players[0].form).toBe(100);
    });

    it('returns a complete immutable post-press snapshot for the next-week transition', () => {
        const original = {
            managerReputation: 70,
            userTeamName: 'Arsenal',
            appliedEvaluationIds: [],
            teams: {
                Arsenal: { players: [{ name: 'Starter', isStarter: true, form: 50 }] },
                Chelsea: { players: [{ name: 'Opponent', isStarter: true, form: 60 }] },
            },
        };

        const transition = applyPressConferenceTransition(original, {
            evaluationId: 'press-transition',
            reputationChange: 2,
            squadFormChange: -1,
        });

        expect(transition.applied).toBe(true);
        expect(transition.managerReputation).toBe(72);
        expect(transition.teams.Arsenal.players[0].form).toBe(49);
        expect(transition.teams.Chelsea).toBe(original.teams.Chelsea);
        expect(transition.teams.Arsenal).not.toBe(original.teams.Arsenal);
        expect(original.teams.Arsenal.players[0].form).toBe(50);
        expect(transition.appliedEvaluationIds).toEqual(['press-transition']);
    });
});
