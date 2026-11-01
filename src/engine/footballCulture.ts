// Source: supplied football-lore-and-history/references/world-derbies-and-rivalries.md.
export type Rivalry = { name: string; clubs: readonly [string, string]; cardMultiplier: number };
const pairs: Array<[string, string, string]> = [
    ['North London Derby', 'Arsenal', 'Tottenham Hotspur'],
    ['Northwest Derby', 'Liverpool', 'Manchester United'],
    ['Manchester Derby', 'Manchester City', 'Manchester United'],
    ['Merseyside Derby', 'Liverpool', 'Everton'],
    ['Tyne-Wear Derby', 'Newcastle United', 'Sunderland'],
    ['El Clásico', 'Real Madrid', 'Barcelona'],
    ['Derbi Madrileño', 'Real Madrid', 'Atletico Madrid'],
    ['Derbi Sevillano', 'Sevilla', 'Real Betis'],
    ['Basque Derby', 'Athletic Club', 'Real Sociedad'],
    ['Derby della Madonnina', 'AC Milan', 'Inter Milan'],
    ["Derby d'Italia", 'Juventus', 'Inter Milan'],
    ['Derby della Capitale', 'Roma', 'Lazio'],
    ['Old Firm', 'Celtic', 'Rangers'],
    ['Der Klassiker', 'Bayern Munich', 'Borussia Dortmund'],
    ['Revierderby', 'Borussia Dortmund', 'Schalke 04'],
    ['Le Classique', 'Paris Saint-Germain', 'Marseille'],
    ['Superclásico', 'Boca Juniors', 'River Plate'],
];
const normalize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\b(fc|cf|as|ss|olympique)\b/g, '').replace(/[^a-z0-9]/g, '')
    .replace(/^milan$/, 'acmilan').replace(/^inter$/, 'intermilan').replace(/^athleticbilbao$/, 'athleticclub')
    .replace(/^(spurs|tottenham)$/, 'tottenhamhotspur').replace(/^psg$/, 'parissaintgermain').replace(/^dortmund$/, 'borussiadortmund');
export function getRivalry(home: string, away: string): Rivalry | null {
    const a = normalize(home), b = normalize(away);
    const match = pairs.find(([, left, right]) => (normalize(left) === a && normalize(right) === b) || (normalize(left) === b && normalize(right) === a));
    return match ? { name: match[0], clubs: [match[1], match[2]], cardMultiplier: 1.6 } : null;
}
