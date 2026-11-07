import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    advanceRelationship, applyIncidentEffects, buildRelationshipIncidents, getIncidentEffects,
    getRelationshipTacticalPenalty, interveneRelationship, relationshipPlayerKey, upsertRelationshipIncidents,
    type BuildRelationshipIncidentsInput, type InternationalRelationshipFixture,
    type RelationshipClubTeam, type RelationshipIncident, type RelationshipMatchEvent, type RelationshipNationalTeam,
    type RelationshipPlayer,
} from '../engine/internationalRelationships';

const p = (name: string, nationality: string, position: RelationshipPlayer['position'], personality: RelationshipPlayer['personality'] = 'Ambitious', extra: Partial<RelationshipPlayer> = {}): RelationshipPlayer => ({
    name, nationality, position, personality, rating: 90, age: 25, wage: 100000, status: { type: 'Available' }, effects: [],
    contractExpires: 4, isStarter: true, condition: 100, form: 50, ...extra,
});
const jude = p('J. Bellingham', 'England', 'AM', 'Leader');
const mbappe = p('K. Mbappé', 'France', 'ST');
const tchouameni = p('A. Tchouameni', 'France', 'DM', 'Professional');
const courtois = p('T. Courtois', 'Belgium', 'GK', 'Professional');
const rice = p('D. Rice', 'England', 'DM', 'Leader');
const deBruyne = p('K. De Bruyne', 'Belgium', 'CM', 'Leader');
const nations = (): RelationshipNationalTeam[] => [
    { name: 'England', countryCode: 'ENG', prestige: 95, players: [p('Jude Bellingham', 'England', 'CM'), p('Declan Rice', 'England', 'DM'), p('Harry Kane', 'England', 'ST'), p('Jordan Pickford', 'England', 'GK')] },
    { name: 'France', countryCode: 'FRA', prestige: 95, players: [p('Kylian Mbappe', 'France', 'LW'), p('Aurelien Tchouameni', 'France', 'DM'), p('Mike Maignan', 'France', 'GK'), p('William Saliba', 'France', 'CB')] },
    { name: 'Belgium', countryCode: 'BEL', prestige: 85, players: [p('Thibaut Courtois', 'Belgium', 'GK'), p('Kevin De Bruyne', 'Belgium', 'CM')] },
];
const club = (players: RelationshipPlayer[], name = 'Madrid'): RelationshipClubTeam => ({ name, players, league: 'La Liga', tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 95,
    chairmanPersonality: 'Traditionalist', balance: 1000000, objectives: [], activePromises: [] });
const goal = (id: number, teamName: string, player: string, extra: Partial<RelationshipMatchEvent> = {}): RelationshipMatchEvent => ({ id, minute: id * 20, type: 'goal', teamName, player, description: 'Goal', ...extra });
const finalFixture = (extra: Partial<InternationalRelationshipFixture> = {}): InternationalRelationshipFixture => ({
    id: 'wc-final', week: 30, league: 'International', homeTeam: 'England', awayTeam: 'France', played: true, score: '3-0', stage: 'Final', isKnockout: true,
    participantNames: { home: ['Jude Bellingham', 'Declan Rice', 'Jordan Pickford'], away: ['Kylian Mbappe', 'Aurelien Tchouameni', 'Mike Maignan'] },
    goalkeeperNames: { home: 'Jordan Pickford', away: 'Mike Maignan' }, events: [goal(1, 'England', 'Jude Bellingham'), goal(2, 'England', 'Jude Bellingham'), goal(3, 'England', 'Jude Bellingham')], ...extra,
});
const groupFixture = (extra: Partial<InternationalRelationshipFixture> = {}): InternationalRelationshipFixture => ({
    id: 'wc-group', week: 10, league: 'International', homeTeam: 'France', awayTeam: 'Belgium', played: true, score: '1-0', stage: 'Group Stage',
    participantNames: { home: ['Kylian Mbappe', 'Aurelien Tchouameni', 'Mike Maignan'], away: ['Thibaut Courtois', 'Kevin De Bruyne'] }, goalkeeperNames: { away: 'Thibaut Courtois' },
    events: [goal(1, 'France', 'Kylian Mbappe', { isPenalty: true })], ...extra,
});
const input = (players: RelationshipPlayer[] = [jude, mbappe, tchouameni, courtois], fixtures = [finalFixture()], extra: Partial<BuildRelationshipIncidentsInput> = {}): BuildRelationshipIncidentsInput => ({
    clubTeams: [club(players)], nationalTeams: nations(), fixtures, tournamentType: 'WorldCup', year: 1, week: 40, ...extra,
});
const pair = (incidents: RelationshipIncident[], a: RelationshipPlayer, b: RelationshipPlayer): RelationshipIncident | undefined => incidents.find(i =>
    [i.playerA.key, i.playerB.key].includes(relationshipPlayerKey(a)) && [i.playerA.key, i.playerB.key].includes(relationshipPlayerKey(b)));
const seriousIncident = (): RelationshipIncident => pair(buildRelationshipIncidents(input()), jude, mbappe)!;
const goodInterpretation = { tone: 'supportive' as const, support: 1, accountability: 1, specificity: 1, respect: 1 };
const selectedKeys = (i: RelationshipIncident): string[] => [i.playerA.key, i.playerB.key];
const freeze = <T>(value: T): T => { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(v => { if (!Object.isFrozen(v)) freeze(v); }); } return value; };

describe('International relationship causality', () => {
    it('weights a Bellingham final hat-trick far above a Mbappe group penalty against Courtois', () => {
        const final = seriousIncident();
        const group = pair(buildRelationshipIncidents(input([mbappe, courtois, tchouameni], [groupFixture()])), mbappe, courtois)!;
        expect(final.severity).toBe('serious');
        expect(group.severity).toBe('minor');
        expect(final.strength).toBeGreaterThan(group.strength * 3);
        expect(final.trigger.labels).toContain('final-humiliation');
        expect(final.trigger.goalEventIds).toEqual([1, 2, 3]);
        expect(final.trigger.decisiveScorerKey).toBe(relationshipPlayerKey(jude));
        expect(group.trigger.labels).toContain('direct-keeper-victim');
    });
    it('does not assign Mbappe’s penalty to non-scoring Tchouameni', () => {
        const results = buildRelationshipIncidents(input([mbappe, courtois, tchouameni], [groupFixture()]));
        expect(pair(results, tchouameni, courtois)).toBeUndefined();
        expect(pair(results, mbappe, tchouameni)).toBeUndefined(); // Winning a group game is not a championship bond.
    });
    it('assigns much less direct final blame to the opposing non-scoring DM', () => {
        const results = buildRelationshipIncidents(input());
        expect(pair(results, jude, tchouameni)!.strength).toBeLessThan(pair(results, jude, mbappe)!.strength / 8);
        expect(pair(results, jude, tchouameni)!.trigger.directKeeperExposureB).toBe(0);
    });
    it('weights the actual keeper victim above a non-scoring midfielder', () => {
        const results = buildRelationshipIncidents(input([mbappe, courtois, deBruyne], [groupFixture()]));
        const direct = pair(results, mbappe, courtois)!;
        expect(pair(results, mbappe, deBruyne)?.strength ?? 0).toBeLessThan(direct.strength / 4);
        expect(Math.max(direct.trigger.directKeeperExposureA, direct.trigger.directKeeperExposureB)).toBe(1);
    });
    it('uses goals count and stage instead of total score or player reputation', () => {
        const single = pair(buildRelationshipIncidents(input([jude, mbappe], [finalFixture({ score: '1-0', events: [goal(1, 'England', 'Jude Bellingham')] })])), jude, mbappe)!;
        const three = seriousIncident();
        const group = pair(buildRelationshipIncidents(input([jude, mbappe], [finalFixture({ stage: 'Group Stage', isKnockout: false })])), jude, mbappe)!;
        expect(three.strength).toBeGreaterThan(single.strength);
        expect(three.strength).toBeGreaterThan(group.strength);
        const othersScored = finalFixture({ events: [goal(1, 'England', 'Harry Kane'), goal(2, 'England', 'Harry Kane'), goal(3, 'England', 'Harry Kane')] });
        expect(buildRelationshipIncidents(input([jude, mbappe], [othersScored]))).toEqual([]);
    });
    it('dampens professionals without forcing a serious final to no relationship', () => {
        const pros = [p(jude.name, jude.nationality, jude.position, 'Professional'), p(mbappe.name, mbappe.nationality, mbappe.position, 'Professional')];
        const professionalFinal = buildRelationshipIncidents(input(pros))[0];
        expect(professionalFinal.strength).toBeLessThan(seriousIncident().strength);
        expect(professionalFinal.severity).toBe('serious');
    });
    it('evaluates every fixture and keeps same-pair group/final incidents distinct', () => {
        const group = finalFixture({ id: 'eng-fra-group', week: 10, stage: 'Group Stage', isKnockout: false });
        const results = buildRelationshipIncidents(input([jude, mbappe], [group, finalFixture()]));
        expect(results).toHaveLength(2);
        expect(new Set(results.map(i => i.id)).size).toBe(2);
        expect(results.map(i => i.trigger.stage)).toEqual(['Group Stage', 'Final']);
    });
    it('does not process unplayed, future, invalid-score, domestic, or absent national-team fixtures', () => {
        for (const bad of [finalFixture({ played: false }), finalFixture({ week: 41 }), finalFixture({ score: 'not played' }), finalFixture({ league: 'La Liga' }), finalFixture({ awayTeam: 'Missing Nation' })]) {
            expect(buildRelationshipIncidents(input([jude, mbappe], [bad]))).toEqual([]);
        }
    });
    it('makes no opposing bond for a draw or merely an absence of feud', () => {
        expect(buildRelationshipIncidents(input([jude, mbappe], [finalFixture({ score: '0-0', events: [], stage: 'Group Stage', isKnockout: false })]))).toEqual([]);
    });
    it('bonds confirmed same-nation club participants in championship success', () => {
        const incident = pair(buildRelationshipIncidents(input([jude, rice])), jude, rice)!;
        expect(incident.kind).toBe('bond');
        expect(incident.trigger.labels).toEqual(['shared-championship-success']);
        expect(getIncidentEffects(incident).every(update => update.effects[0].type === 'TeammateBond')).toBe(true);
        expect(buildRelationshipIncidents(input([jude, rice], [finalFixture({ participantNames: { home: ['Jude Bellingham'], away: ['Kylian Mbappe'] } })]))).toEqual([]);
    });
    it('can create negative shared chemistry after failure, weighted by expectation and personality', () => {
        const disappointed = pair(buildRelationshipIncidents(input([mbappe, tchouameni])), mbappe, tchouameni)!;
        expect(disappointed.kind).toBe('shared-disappointment');
        expect(getIncidentEffects(disappointed)[0].effects[0].type).toBe('BadChemistry');
        const low = buildRelationshipIncidents(input([mbappe, tchouameni], [finalFixture({ stage: 'Group Stage', isKnockout: false })], { expectations: { France: 0.2 } }));
        expect(low).toEqual([]);
        const volatile = buildRelationshipIncidents(input([p(mbappe.name, 'France', 'ST', 'Volatile'), p(tchouameni.name, 'France', 'DM', 'Volatile')]))[0];
        expect(volatile.strength).toBeGreaterThan(disappointed.strength);
    });
    it('uses a shootout winner for championship bonds and verified shootout duels, without inventing goals', () => {
        const f = groupFixture({ id: 'shootout-final', week: 30, stage: 'Final', isKnockout: true, score: '0-0', events: [], penaltyWinner: 'home',
            penalties: [{ id: 'p1', teamName: 'France', taker: 'Kylian Mbappe', goalkeeper: 'Thibaut Courtois', outcome: 'scored', shootout: true, decisive: true }] });
        const results = buildRelationshipIncidents(input([mbappe, tchouameni, courtois], [f]));
        expect(pair(results, mbappe, tchouameni)!.kind).toBe('bond');
        const duel = pair(results, mbappe, courtois)!;
        expect(duel.trigger.penaltyIds).toEqual(['p1']);
        expect(duel.trigger.playerAGoals + duel.trigger.playerBGoals).toBe(0);
    });
    it('does not double-count duplicated goals or regular scored penalty details', () => {
        const base = groupFixture();
        const repeated = groupFixture({ events: [base.events![0], base.events![0]], penalties: [{ id: 'p1', teamName: 'France', taker: 'Kylian Mbappe', goalkeeper: 'Thibaut Courtois', outcome: 'scored' }] });
        expect(pair(buildRelationshipIncidents(input([mbappe, courtois], [base])), mbappe, courtois)!.strength)
            .toBe(pair(buildRelationshipIncidents(input([mbappe, courtois], [repeated])), mbappe, courtois)!.strength);
    });
    it('never identifies a decisive scorer from an incomplete event timeline without score evidence', () => {
        const result = pair(buildRelationshipIncidents(input([jude, mbappe], [finalFixture({ events: [goal(3, 'England', 'Jude Bellingham')] })])), jude, mbappe)!;
        expect(result.trigger.decisiveScorerKey).toBeUndefined();
        expect(result.trigger.playerAGoals + result.trigger.playerBGoals).toBe(1);
    });
});

describe('Verified identities and participation', () => {
    it('accepts unambiguous initials, diacritics and compatible national roles', () => {
        const result = seriousIncident();
        expect(new Set([result.playerA.name, result.playerB.name])).toEqual(new Set(['J. Bellingham', 'K. Mbappé']));
    });
    it('does not fabricate nonparticipants from squad membership or club/national isStarter', () => {
        expect(buildRelationshipIncidents(input([jude, mbappe], [finalFixture({ events: [], participantNames: undefined, goalkeeperNames: undefined })]))).toEqual([]);
        expect(buildRelationshipIncidents(input([jude, mbappe], [finalFixture({ participantNames: { home: ['Jude Bellingham'], away: ['Mike Maignan'] } })]))).toEqual([]);
    });
    it('uses named factual events as participation only, not commentary or whistles', () => {
        const f = groupFixture({ participantNames: undefined, goalkeeperNames: undefined, events: [goal(1, 'France', 'Kylian Mbappe', { goalkeeper: 'Thibaut Courtois', isPenalty: true })] });
        expect(pair(buildRelationshipIncidents(input([mbappe, courtois], [f])), mbappe, courtois)).toBeDefined();
        const commentary = { ...f, events: [{ ...goal(1, 'Belgium', 'Thibaut Courtois'), type: 'commentary' as const }, goal(2, 'France', 'Kylian Mbappe')] };
        expect(buildRelationshipIncidents(input([mbappe, courtois], [commentary]))).toEqual([]);
    });
    it('refuses ambiguous initial mappings and surname-only guesses', () => {
        const ns = nations();
        ns[1].players.push(p('Karim Mbappe', 'France', 'ST'));
        expect(buildRelationshipIncidents(input([jude, mbappe], [finalFixture()], { nationalTeams: ns }))).toEqual([]);
        const surname = p('Mbappe', 'France', 'ST');
        expect(buildRelationshipIncidents(input([jude, surname]))).toEqual([]);
        const badEvent = groupFixture({ events: [goal(1, 'France', 'Mbappe')] });
        expect(buildRelationshipIncidents(input([mbappe, courtois], [badEvent]))).toEqual([]);
    });
    it('accepts explicit aliases only when unique per national roster', () => {
        const ns = nations(); ns[1].players[0].aliases = ['Kiki'];
        const f = groupFixture({ events: [goal(1, 'France', 'Kiki')] });
        expect(pair(buildRelationshipIncidents(input([mbappe, courtois], [f], { nationalTeams: ns })), mbappe, courtois)).toBeDefined();
        ns[1].players[1].aliases = ['Kiki'];
        expect(buildRelationshipIncidents(input([mbappe, courtois], [f], { nationalTeams: ns }))).toEqual([]);
    });
    it('rejects incompatible positions, wrong nationality and distinct full first names', () => {
        for (const wrong of [p(jude.name, 'England', 'GK'), p(jude.name, 'Belgium', 'AM'), p('James Bellingham', 'England', 'AM')]) {
            expect(buildRelationshipIncidents(input([wrong, mbappe]))).toEqual([]);
        }
    });
    it('uses explicit external IDs and rejects contradictory IDs instead of matching names', () => {
        const ns = nations(); ns[1].players[0].externalId = 'mbappe-7';
        const identified = p('Different display', 'France', 'ST', 'Ambitious', { externalId: 'mbappe-7' });
        expect(pair(buildRelationshipIncidents(input([jude, identified], [finalFixture()], { nationalTeams: ns })), jude, identified)).toBeDefined();
        const conflict = { ...mbappe, externalId: 'not-mbappe' };
        expect(buildRelationshipIncidents(input([jude, conflict], [finalFixture()], { nationalTeams: ns }))).toEqual([]);
    });
    it('prioritizes a unique external ID over differing nationality display encodings, but rejects duplicate roster IDs', () => {
        const ns = nations(); ns[0].players[0].externalId = 'verified-jude';
        const linked = { ...jude, externalId: 'verified-jude', nationality: 'legacy-nationality-display' };
        expect(pair(buildRelationshipIncidents(input([linked, mbappe], [finalFixture()], { nationalTeams: ns })), linked, mbappe)).toBeDefined();
        ns[0].players.push({ ...ns[0].players[0], name: 'Duplicate provider record' });
        expect(buildRelationshipIncidents(input([linked, mbappe], [finalFixture()], { nationalTeams: ns }))).toEqual([]);
    });
    it('rejects duplicate club identities and multiple national-roster identities', () => {
        expect(buildRelationshipIncidents(input([jude, { ...jude }, mbappe]))).toEqual([]);
        const ns = nations(); ns.push({ ...ns[0], name: 'Other England' });
        expect(buildRelationshipIncidents(input([jude, mbappe], [finalFixture()], { nationalTeams: ns }))).toEqual([]);
    });
    it('preserves distinct England/Scotland flag identities and uses actual national codes', () => {
        const english = '\u{1f3f4}\u{e0067}\u{e0062}\u{e0065}\u{e006e}\u{e0067}\u{e007f}';
        const scottish = '\u{1f3f4}\u{e0067}\u{e0062}\u{e0073}\u{e0063}\u{e0074}\u{e007f}';
        const ns = nations(); ns[0].players = ns[0].players.map(player => ({ ...player, nationality: english }));
        ns.push({ name: 'Scotland', countryCode: 'SCO', prestige: 70, players: [p('Jude Bellingham', scottish, 'CM')] });
        const flaggedJude = { ...jude, nationality: english, nationalTeamCode: 'ENG' };
        expect(pair(buildRelationshipIncidents(input([flaggedJude, mbappe], [finalFixture()], { nationalTeams: ns })), flaggedJude, mbappe)?.nationA.name).toBeDefined();
        expect(relationshipPlayerKey(flaggedJude)).not.toBe(relationshipPlayerKey({ ...flaggedJude, nationality: scottish }));
    });
    it('does not invent keeper attribution when two keepers participated', () => {
        const ns = nations(); ns[2].players.push(p('Simon Mignolet', 'Belgium', 'GK'));
        const f = groupFixture({ goalkeeperNames: undefined, participantNames: { home: ['Kylian Mbappe'], away: ['Thibaut Courtois', 'Simon Mignolet'] } });
        expect(buildRelationshipIncidents(input([mbappe, courtois], [f], { nationalTeams: ns }))).toEqual([]);
        f.events = [goal(1, 'France', 'Kylian Mbappe', { goalkeeper: 'Thibaut Courtois', isPenalty: true })];
        expect(pair(buildRelationshipIncidents(input([mbappe, courtois], [f], { nationalTeams: ns })), mbappe, courtois)).toBeDefined();
    });
});

describe('Durability, interventions and immutable effects', () => {
    it('is deterministic, immutable, and idempotent across fixtures and calendar years', () => {
        const initialInput = freeze(input([jude, mbappe]));
        const first = buildRelationshipIncidents(initialInput);
        expect(buildRelationshipIncidents(initialInput)).toEqual(first);
        expect(buildRelationshipIncidents({ ...initialInput, existingIncidents: first })).toEqual(first);
        expect(upsertRelationshipIncidents(first, [...first, ...first])).toEqual(first);
        const nextYear = buildRelationshipIncidents(input([jude, mbappe], [finalFixture()], { year: 2, existingIncidents: first }));
        expect(nextYear).toHaveLength(2);
        expect(nextYear[0].id).not.toBe(nextYear[1].id);
    });
    it('preserves interventions on replay and escalates stronger enriched fixture evidence only once', () => {
        const singleInput = input([jude, mbappe], [finalFixture({ score: '1-0', events: [goal(1, 'England', 'Jude Bellingham')] })]);
        const first = buildRelationshipIncidents(singleInput)[0];
        const mediated = interveneRelationship(first, 'mediation', { year: 1, week: 31, interpretation: goodInterpretation }).incident;
        const replay = buildRelationshipIncidents({ ...singleInput, existingIncidents: [mediated] })[0];
        expect(replay).toEqual(mediated);
        const enriched = buildRelationshipIncidents(input([jude, mbappe], [finalFixture()], { existingIncidents: [mediated] }))[0];
        expect(enriched.strength).toBeGreaterThan(mediated.strength);
        expect(enriched.attempts).toEqual(mediated.attempts);
        expect(buildRelationshipIncidents(input([jude, mbappe], [finalFixture()], { existingIncidents: [enriched] }))[0]).toEqual(enriched);
    });
    it('benches either side without deleting the relationship or ongoing training penalties', () => {
        const original = freeze(seriousIncident());
        for (const action of ['bench-a', 'bench-b'] as const) {
            const result = interveneRelationship(original, action, { year: 1, week: 31 });
            const benched = action === 'bench-a' ? original.playerA.key : original.playerB.key;
            expect(result.incident.state).toBe('separated');
            expect(result.incident.strength).toBe(original.strength);
            expect(result.incident.separatedPlayerKey).toBe(benched);
            const teams = { recordKey: club([jude, mbappe]) };
            const applied = applyIncidentEffects(teams, result.effects);
            expect(applied.recordKey.players.find(player => relationshipPlayerKey(player) === benched)!.isStarter).toBe(false);
            expect(applied.recordKey.players.every(player => player.effects.some(effect => effect.type === 'InternationalRift'))).toBe(true);
            const impact = getRelationshipTacticalPenalty([result.incident], [action === 'bench-a' ? original.playerB.key : original.playerA.key], { year: 1, week: 31 });
            expect(impact.penalty).toBe(0);
            expect(impact.trainingPenalties[benched]).toBeGreaterThan(0);
            expect(original.state).toBe('active');
        }
    });
    it('risk-it retains unresolved severity and does not fabricate an actual co-selection', () => {
        const separated = interveneRelationship(seriousIncident(), 'bench-a', { year: 1, week: 31 }).incident;
        const risk = interveneRelationship(separated, 'risk-it', { year: 1, week: 31, attemptId: 'risk-1' }).incident;
        expect(risk.state).toBe('active'); expect(risk.separatedPlayerKey).toBeUndefined();
        expect(risk.strength).toBe(separated.strength); expect(risk.coSelectionWeeks).toEqual([]);
    });
    it('supports bounded genuine repair, but one mediation never heals final humiliation', () => {
        const original = freeze(seriousIncident());
        const result = interveneRelationship(original, 'mediation', { year: 1, week: 31, attemptId: 'talk-1', interpretation: { ...goodInterpretation, support: 1000, respect: Infinity, accountability: -1 } });
        expect(result.incident.state).not.toBe('resolved');
        expect(result.incident.strength).toBeGreaterThanOrEqual(original.strength - 12);
        expect(result.incident.attempts[0].interpretation).toMatchObject({ support: 1, respect: 0, accountability: 0 });
        expect(interveneRelationship(result.incident, 'mediation', { year: 1, week: 31, attemptId: 'talk-1', interpretation: goodInterpretation }).incident).toEqual(result.incident);
        let repaired = original;
        for (let week = 31; week <= 44; week++) repaired = interveneRelationship(repaired, 'mediation', { year: 1, week, interpretation: goodInterpretation }).incident;
        expect(repaired.state).toBe('resolved'); expect(repaired.strength).toBeLessThan(3);
    });
    it('does not permanently veto credible repair at the serious final floor', () => {
        let incident = { ...seriousIncident(), strength: 62, evidenceStrength: 62 };
        for (let week = 31; week <= 34; week++) incident = interveneRelationship(incident, 'mediation', { year: 1, week, interpretation: goodInterpretation }).incident;
        expect(incident.strength).toBeLessThan(60);
    });
    it('resists same-week mediation spam and weights volatile resistance above professionals', () => {
        const base = seriousIncident();
        const first = interveneRelationship(base, 'mediation', { year: 1, week: 31, attemptId: 'a', interpretation: goodInterpretation }).incident;
        const second = interveneRelationship(first, 'mediation', { year: 1, week: 31, attemptId: 'b', interpretation: goodInterpretation }).incident;
        expect(second.strength).toBe(first.strength); expect(second.attempts[1].outcome).toBe('resisted');
        const make = (personality: RelationshipPlayer['personality']) => ({ ...base, strength: 80, trigger: { ...base.trigger, labels: [] }, playerA: { ...base.playerA, personality }, playerB: { ...base.playerB, personality } });
        const pro = interveneRelationship(make('Professional'), 'mediation', { year: 1, week: 31, interpretation: goodInterpretation }).incident;
        const volatile = interveneRelationship(make('Volatile'), 'mediation', { year: 1, week: 31, interpretation: goodInterpretation }).incident;
        expect(pro.strength).toBeLessThan(volatile.strength);
        expect(interveneRelationship(base, 'mediation', { year: 1, week: 31, interpretation: { tone: 'hostile', respect: 0 } }).incident.strength).toBeGreaterThanOrEqual(base.strength);
    });
    it('requests transfer only after repeated actual co-selection and genuine elapsed weeks', () => {
        let incident = seriousIncident();
        const selected = selectedKeys(incident);
        const at = (week: number, lineup: string[] = selected) => { incident = advanceRelationship(incident, { year: 1, week, selectedPlayerKeys: lineup }).incident; };
        at(30); at(30); at(31); at(32);
        expect(incident.coSelectionWeeks).toHaveLength(3); expect(incident.transferRequestedPlayerKeys).toEqual([]);
        at(33);
        expect(incident.state).toBe('transfer-requested'); expect(incident.transferRequestedPlayerKeys).toHaveLength(1);
        expect(incident.transferRequestedPlayerKeys[0]).toBe(relationshipPlayerKey(mbappe));
        const applied = applyIncidentEffects({ Madrid: club([jude, mbappe]) }, getIncidentEffects(incident, { year: 1, week: 33 }));
        expect(applied.Madrid.players.find(player => player.name === mbappe.name)!.transferRequested).toBe(true);
    });
    it('does not request a transfer for elapsed time alone, separation, repeated clicks or a resolved relationship', () => {
        const original = seriousIncident();
        const separated = interveneRelationship(original, 'bench-a', { year: 1, week: 31 }).incident;
        expect(advanceRelationship(original, { year: 1, week: 39 }).incident.transferRequestedPlayerKeys).toEqual([]);
        expect(advanceRelationship(separated, { year: 1, week: 39, selectedPlayerKeys: [separated.playerB.key] }).incident.transferRequestedPlayerKeys).toEqual([]);
        expect(advanceRelationship({ ...original, state: 'resolved' }, { year: 1, week: 39, selectedPlayerKeys: selectedKeys(original) }).incident.transferRequestedPlayerKeys).toEqual([]);
    });
    it('tracks year rollover with real calendar elapsed weeks and ignores backward advancement', () => {
        let incident = buildRelationshipIncidents(input([jude, mbappe], [finalFixture({ week: 51 })], { week: 52 }))[0];
        for (const clock of [{ year: 1, week: 51 }, { year: 1, week: 52 }, { year: 2, week: 2 }]) incident = advanceRelationship(incident, { ...clock, selectedPlayerKeys: selectedKeys(incident) }).incident;
        expect(incident.state).toBe('transfer-requested');
        expect(advanceRelationship(incident, { year: 1, week: 50 }).incident).toBe(incident);
        const update = getIncidentEffects(incident, { year: 2, week: 2 })[0].effects[0];
        expect(update.expiresYear).toBe(2); expect(update.expiresWeek).toBe(19);
    });
    it('expires effects without deleting incident/attempt history or unrelated player effects', () => {
        const original = seriousIncident();
        const unrelated = { type: 'PromiseBroken' as const, until: 50, message: 'Promise' };
        const teams = freeze({ Madrid: club([{ ...jude, effects: [unrelated] }, mbappe]) });
        const active = applyIncidentEffects(teams, getIncidentEffects(original, { year: 1, week: 31 }));
        const replay = applyIncidentEffects(active, getIncidentEffects(original, { year: 1, week: 31 }));
        expect(replay).toEqual(active); expect(replay.Madrid.players[0].form).toBe(50);
        expect(teams.Madrid.players[0].effects).toEqual([unrelated]);
        const expired = advanceRelationship(original, { year: 1, week: 50 });
        expect(expired.incident.state).toBe('expired'); expect(expired.incident.trigger).toEqual(original.trigger);
        const cleared = applyIncidentEffects(active, expired.effects);
        expect(cleared.Madrid.players[0].effects).toEqual([unrelated]); expect(cleared.Madrid.players[1].effects).toEqual([]);
    });
    it('deduplicates pair tactical penalties and blocks serious co-selection without double penalties', () => {
        const first = seriousIncident();
        const second = { ...first, id: 'second-fixture', strength: 80 };
        const impact = getRelationshipTacticalPenalty([first, second], selectedKeys(first), { year: 1, week: 31 });
        expect(impact.penalty).toBe(30); expect(impact.blockedPairs).toHaveLength(1);
        const bond = { ...first, id: 'bond', kind: 'bond' as const };
        expect(getRelationshipTacticalPenalty([bond, first], selectedKeys(first), { year: 1, week: 31 }).bonus).toBe(0);
        expect(getRelationshipTacticalPenalty([first], selectedKeys(first), { year: 1, week: 50 }).penalty).toBe(0);
    });
    it('produces independent incidents for every club, without touching other squads', () => {
        const results = buildRelationshipIncidents(input([jude, mbappe], [finalFixture()], { clubTeams: { a: club([jude, mbappe]), b: club([jude, mbappe], 'Other Club') } }));
        expect(results).toHaveLength(2); expect(results[0].id).not.toBe(results[1].id);
        const teams = { a: club([jude, mbappe]), other: club([jude, mbappe], 'Unaffected') };
        const applied = applyIncidentEffects(teams, getIncidentEffects(results.find(i => i.clubName === 'Madrid')!));
        expect(applied.other).toBe(teams.other); expect(applied.a).not.toBe(teams.a);
    });
});


describe('Real seeded club / source roster integration', () => {
    // Another agent owns this source asset. Independent engine tests remain runnable while it is prepared.
    it.runIf(existsSync(new URL('../data/nationalRosterSnapshot.json', import.meta.url)))('links real Madrid abbreviations through verified roster IDs without blaming a non-scoring DM', async () => {
        const { TEAMS } = await import('../constants');
        const rosterModulePath = '../engine/nationalRosters.ts';
        const { createNationalRosterTeam, linkNationalRosterIdentitiesToClubTeams } = await import(rosterModulePath);
        const madrid = linkNationalRosterIdentitiesToClubTeams({ Madrid: TEAMS['Real Madrid'] }).Madrid as RelationshipClubTeam;
        const clubPlayer = (name: string): RelationshipPlayer => madrid.players.find(player => player.name === name)!;
        const linkedJude = clubPlayer('J. Bellingham'), linkedMbappe = clubPlayer('K. Mbappé');
        const linkedCourtois = clubPlayer('T. Courtois'), linkedTchouameni = clubPlayer('A. Tchouameni');
        for (const player of [linkedJude, linkedMbappe, linkedCourtois, linkedTchouameni]) expect(player.externalId).toBeTruthy();
        const actualNations: RelationshipNationalTeam[] = ['ENG', 'FRA', 'BEL'].map(code => createNationalRosterTeam(code));
        const nationalPlayer = (player: RelationshipPlayer): RelationshipPlayer => actualNations.flatMap(n => n.players).find(np => np.externalId === player.externalId)!;
        const nationalJude = nationalPlayer(linkedJude), nationalMbappe = nationalPlayer(linkedMbappe);
        const nationalCourtois = nationalPlayer(linkedCourtois), nationalTchouameni = nationalPlayer(linkedTchouameni);
        for (const player of [nationalJude, nationalMbappe, nationalCourtois, nationalTchouameni]) expect(player).toBeDefined();
        const f = finalFixture({
            participantNames: { home: [nationalJude.name], away: [nationalMbappe.name, nationalTchouameni.name] },
            goalkeeperNames: undefined,
            events: [1, 2, 3].map(id => goal(id, 'England', nationalJude.name, { playerExternalId: nationalJude.externalId })),
        });
        const g = groupFixture({
            participantNames: { home: [nationalMbappe.name, nationalTchouameni.name], away: [nationalCourtois.name] },
            goalkeeperNames: { away: nationalCourtois.name },
            events: [goal(1, 'France', nationalMbappe.name, { playerExternalId: nationalMbappe.externalId, goalkeeperExternalId: nationalCourtois.externalId, isPenalty: true })],
        });
        const common = { ...input(), clubTeams: { Madrid: madrid }, nationalTeams: actualNations };
        const final = pair(buildRelationshipIncidents({ ...common, fixtures: [f] }), linkedJude, linkedMbappe)!;
        const groups = buildRelationshipIncidents({ ...common, fixtures: [g] });
        const group = pair(groups, linkedMbappe, linkedCourtois)!;
        expect(final.severity).toBe('serious');
        expect(final.strength).toBeGreaterThan(group.strength * 3);
        expect(pair(groups, linkedTchouameni, linkedCourtois)).toBeUndefined();
        expect(final.playerA.name).not.toBe('Jobe Bellingham');
        expect(new Set([final.playerA.externalId, final.playerB.externalId])).toEqual(new Set([linkedJude.externalId, linkedMbappe.externalId]));
    });
});
