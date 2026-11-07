import { AppScreen, GameState } from '../types';
import { ensureTeamAndPlayerFields } from '../utils';
import { normalizePressConferenceContext, normalizePressConferenceSession, normalizePressReport } from './pressConference';
import { normalizeTutorialResult } from './tutorialProgression';
export const CAREER_SAVE_VERSION = 3;
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const requireText = (value: unknown, field: string) => { if (typeof value !== 'string' || !value.trim()) throw new Error(`Career save has an invalid ${field}.`); };
const requireNumber = (value: unknown, field: string, min = -Infinity, max = Infinity) => { if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`Career save has an invalid ${field}.`); };
const positions = new Set(['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'DM', 'CM', 'LM', 'RM', 'AM', 'LW', 'RW', 'CF', 'ST']);
const eventTypes = new Set(['goal', 'sub', 'injury', 'card', 'whistle', 'commentary']);
function validatePlayer(player: unknown) {
    if (!object(player)) throw new Error('Career save contains an invalid player.');
    requireText(player.name, 'player name');
    if (!positions.has(player.position)) throw new Error('Career save contains an invalid player position.');
    requireNumber(player.rating, 'player rating', 0, 100);
    requireNumber(player.age, 'player age', 0, 100);
    requireNumber(player.wage, 'player wage', 0);
    if (typeof player.isStarter !== 'boolean') throw new Error('Career save has an invalid starter flag.');
    if (player.status !== undefined && (!object(player.status) || !['Available', 'Injured', 'Suspended', 'On International Duty', 'SentOff'].includes(player.status.type))) throw new Error('Career save has an invalid player status.');
    for (const field of ['form', 'condition', 'stamina', 'potential']) if (player[field] !== undefined) requireNumber(player[field], `player ${field}`, 0, 100);
    if (player.effects !== undefined && !Array.isArray(player.effects)) throw new Error('Career save has invalid player effects.');
    if (player.stats !== undefined && !object(player.stats)) throw new Error('Career save has invalid player stats.');
}
function validateEvents(events: unknown) {
    if (!Array.isArray(events)) throw new Error('Career save has an invalid match event ledger.');
    for (const event of events) {
        if (!object(event) || !eventTypes.has(event.type)) throw new Error('Career save has an invalid match event.');
        requireNumber(event.id, 'event id'); requireNumber(event.minute, 'event minute', 0, 130); requireText(event.description, 'event description');
        for (const key of ['pitchX', 'pitchY']) if (event[key] !== undefined) requireNumber(event[key], key, 0, 100);
        if (event.play !== undefined) {
            if (!object(event.play) || !Array.isArray(event.play.ballPath) || event.play.ballPath.length < 2 || event.play.ballPath.length > 12) throw new Error('Career save has an invalid highlight path.');
            for (const point of event.play.ballPath) { if (!object(point)) throw new Error('Invalid pitch point.'); requireNumber(point.x, 'pitch point x', 0, 100); requireNumber(point.y, 'pitch point y', 0, 100); }
        }
    }
}

export function migrateCareerSave(input: unknown): Record<string, any> {
    if (!object(input)) throw new Error('Career save is not a valid object.');
    const version = input.version ?? 1;
    if (!Number.isInteger(version) || version < 1) throw new Error('Career save has an invalid version.');
    if (version > CAREER_SAVE_VERSION) throw new Error('This career was saved by a newer game version.');
    const unemployed = input.gameMode === 'Club' && !input.userTeamName && input.appScreen === AppScreen.JOB_CENTRE;
    if (!object(input.teams) || (!unemployed && (!input.userTeamName || !input.teams[input.userTeamName])) || !Array.isArray(input.fixtures) || !Array.isArray(input.leagueTable)) throw new Error('Career save is missing its club, fixtures or table.');
    requireNumber(input.currentWeek, 'career week', 1, 1000);
    for (const [name, team] of Object.entries(input.teams)) {
        if (!object(team) || !Array.isArray(team.players)) throw new Error(`Career save has an invalid squad for ${name}.`);
        requireText(team.name, 'club name'); requireText(team.league, 'club competition');
        if (!object(team.tactic) || typeof team.tactic.formation !== 'string' || typeof team.tactic.mentality !== 'string') throw new Error(`Career save has invalid tactics for ${name}.`);
        if (team.balance !== undefined) requireNumber(team.balance, 'club balance');
        if (team.activePromises !== undefined && !Array.isArray(team.activePromises)) throw new Error('Career save has invalid club promises.');
        team.players.forEach(validatePlayer);
    }
    for (const fixture of input.fixtures) {
        if (!object(fixture)) throw new Error('Career save has an invalid fixture.');
        requireText(fixture.id, 'fixture id'); requireText(fixture.homeTeam, 'home club'); requireText(fixture.awayTeam, 'away club'); requireNumber(fixture.week, 'fixture week', 0, 1000);
        if (fixture.events !== undefined) validateEvents(fixture.events);
        if (fixture.participantNames !== undefined && (!object(fixture.participantNames) || !['home', 'away'].every(side => Array.isArray(fixture.participantNames[side]) && fixture.participantNames[side].every((name: unknown) => typeof name === 'string' && name.length > 0)))) throw new Error('Career save has invalid national match participants.');
    }
    for (const row of input.leagueTable) { if (!object(row)) throw new Error('Career save has an invalid table row.'); requireText(row.teamName, 'table club'); requireNumber(row.points, 'table points', -100, 1000); }
    if (input.transferMarket !== undefined) { if (!Array.isArray(input.transferMarket)) throw new Error('Career save has an invalid transfer market.'); input.transferMarket.forEach(validatePlayer); }
    if (input.matchState !== undefined && input.matchState !== null) {
        const live = input.matchState;
        if (!object(live)) throw new Error('Career save has an invalid live match.');
        requireNumber(live.currentMinute, 'match minute', 0, 120); requireNumber(live.homeScore, 'home score', 0, 30); requireNumber(live.awayScore, 'away score', 0, 30);
        validateEvents(live.events);
    }
    if (input.pendingEvents !== undefined) validateEvents(input.pendingEvents);
    const data = structuredClone(input);
    data.teams = ensureTeamAndPlayerFields(data.teams);
    const live = data.matchState;
    if (live && version === 1) {
        const clock = Number.isFinite(data.currentPlaybackMinute) ? data.currentPlaybackMinute : live.currentMinute || 0;
        const fixture = data.fixtures.find((f: any) => (f.homeTeam === data.userTeamName || f.awayTeam === data.userTeamName) && f.week === data.currentWeek);
        live.events = live.events.filter((event: any) => event.minute <= clock);
        if (fixture) {
            live.homeScore = live.events.filter((event: any) => event.type === 'goal' && event.teamName === fixture.homeTeam).length;
            live.awayScore = live.events.filter((event: any) => event.type === 'goal' && event.teamName === fixture.awayTeam).length;
        }
        live.currentMinute = clock; live.isFinished = data.gameState === GameState.POST_MATCH;
        live.sessionId ||= `restored-${fixture?.id || 'match'}-${live.simulationSeed || 0}`;
    }
    if (live) { live.subsUsed ||= { home: 0, away: 0 }; live.momentum = Number.isFinite(live.momentum) ? Math.max(-10, Math.min(10, live.momentum)) : 0; live.tacticalAnalysis ||= ''; }
    data.pendingEvents = Array.isArray(data.pendingEvents) ? data.pendingEvents.filter((event: any) => event.minute > (live?.currentMinute || 0)) : [];
    data.appliedPressEvaluationIds = Array.isArray(data.appliedPressEvaluationIds) ? data.appliedPressEvaluationIds.filter((id: any) => typeof id === 'string').slice(-1000) : [];
    data.managerReputation = Number.isFinite(data.managerReputation) ? Math.max(0, Math.min(100, data.managerReputation)) : 50;
    if (data.tutorialCompletion !== undefined && data.tutorialCompletion !== null && !normalizeTutorialResult(data.tutorialCompletion)) throw new Error('Career save has an invalid World Cup tutorial result.');
    data.tutorialCompletion = normalizeTutorialResult(data.tutorialCompletion);
    data.gameMode = data.gameMode || (data.teams[data.userTeamName]?.league === 'International' ? 'WorldCup' : 'Club');
    data.hasClubCareer = typeof data.hasClubCareer === 'boolean' ? data.hasClubCareer : data.gameMode === 'Club' && !!data.userTeamName;
    if (data.availableJobs !== undefined && (!Array.isArray(data.availableJobs) || data.availableJobs.some((job: unknown) => !object(job) || typeof job.teamName !== 'string' || !Number.isFinite(job.prestige)))) throw new Error('Career save has invalid job opportunities.');
    if (data.pressInput) data.pressInput = normalizePressConferenceContext(data.pressInput);
    if (data.pressQuestionResult) {
        if (data.pressQuestionResult.mode === 'ai-questions') data.pressQuestionResult.session = normalizePressConferenceSession(data.pressQuestionResult.session);
        else if (data.pressQuestionResult.mode !== 'unavailable' || typeof data.pressQuestionResult.failure?.message !== 'string') throw new Error('Career save has invalid press questions.');
    }
    if (data.pressProgress) {
        const session = data.pressQuestionResult?.session;
        if (!session || data.pressProgress.sessionId !== session.id || !Array.isArray(data.pressProgress.answers) || data.pressProgress.answers.length > 3) throw new Error('Career save has invalid press progress.');
        const ids = new Set<string>();
        for (const answer of data.pressProgress.answers) {
            if (!object(answer) || !session.questions.some((question: any) => question.id === answer.questionId) || ids.has(answer.questionId) || typeof answer.answer !== 'string' || !answer.answer.trim() || answer.answer.length > 1600) throw new Error('Career save has an invalid press answer.');
            ids.add(answer.questionId);
        }
        const evaluation = data.pressProgress.evaluation;
        if (evaluation?.mode === 'ai-editorial') evaluation.report = normalizePressReport({ session, answers: data.pressProgress.answers }, evaluation.report);
        else if (evaluation && (evaluation.mode !== 'unavailable' || typeof evaluation.failure?.message !== 'string')) throw new Error('Career save has an invalid press outcome.');
    }
    data.version = CAREER_SAVE_VERSION;
    return data;
}
