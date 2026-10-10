export type SeasonKitTheme = {
    id: 'home' | 'away' | 'third';
    label: string;
    bg: string;
    accent: string;
    text: string;
    colorNames: readonly string[];
    design: string;
    brand: string;
    sponsor: string;
    released: string;
    description: string;
    sourceName: 'Football Kit Archive';
    sourceUrl: string;
    imageUrl: string;
};

export const SEASON_THEME_PACK = '2026/27';
const SOURCE_NAME = 'Football Kit Archive' as const;

const kit = (data: Omit<SeasonKitTheme, 'label' | 'sourceName'>): SeasonKitTheme => ({
    ...data,
    label: `${data.id.toUpperCase()} · ${SEASON_THEME_PACK}`,
    sourceName: SOURCE_NAME,
});

/**
 * Source-backed 2026/27 kit records. Each record is tied to its Football Kit Archive page
 * and the page's OG image. Do not manufacture a current-season kit from legacy club colors:
 * clubs without a record intentionally return an empty set until they are sourced.
 */
const VERIFIED_KITS_BY_CLUB: Record<string, readonly SeasonKitTheme[]> = {
    'Manchester City': [
        kit({ id: 'home', bg: '#6CABDD', accent: '#FFFFFF', text: '#102B62', colorNames: ['Sky blue', 'White'], design: 'Gradient', brand: 'Puma', sponsor: 'Etihad Airways', released: '2026-05-20', description: 'Sky-blue base fading into white at the hem, with a white crew neck and sleeve cuffs.', sourceUrl: 'https://www.footballkitarchive.com/manchester-city-2026-27-home-kit-441641/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/05/20/aZesqwjJvRIgBkC/manchester-city-2026-27-home-kit.jpg' }),
        kit({ id: 'away', bg: '#111111', accent: '#C8A951', text: '#FFFFFF', colorNames: ['Black', 'Gold'], design: 'Worker-bee graphic', brand: 'Puma', sponsor: 'Etihad Airways', released: '2026-07-31', description: 'Black base with an embossed worker-bee pattern and gold collar, cuffs, and side stripes.', sourceUrl: 'https://www.footballkitarchive.com/manchester-city-2026-27-away-kit-486529/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/07/31/3zPin3IdHzbtFJN/manchester-city-2026-27-away-kit.jpg' }),
        kit({ id: 'third', bg: '#FFFFFF', accent: '#6CABDD', text: '#102B62', colorNames: ['White', 'Blue', 'Sky blue'], design: 'Single vertical stripe', brand: 'Puma', sponsor: 'Etihad Airways', released: '2026-08-27', description: 'White AI-designed base with a sky-blue and navy vertical stripe and dark-blue marks.', sourceUrl: 'https://www.footballkitarchive.com/manchester-city-2026-27-third-kit-427765/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/08/27/sEezCyGjoD5NVUG/manchester-city-2026-27-third-kit.jpg' }),
    ],
    'Liverpool': [
        kit({ id: 'home', bg: '#8D1B2D', accent: '#FFFFFF', text: '#FFFFFF', colorNames: ['Active maroon', 'White'], design: 'Geometric graphic', brand: 'adidas', sponsor: 'Standard Chartered', released: '2026-05-19', description: 'Darker active-maroon base with a subtle all-over geometric pattern inspired by the 1989–91 home kit.', sourceUrl: 'https://www.footballkitarchive.com/liverpool-fc-2026-27-home-kit-448385/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/05/26/AcdVtw4S48aWtN9/liverpool-fc-2026-27-home-kit.jpg' }),
        kit({ id: 'away', bg: '#FFFFFF', accent: '#8D1B2D', text: '#8D1B2D', colorNames: ['White', 'Maroon red'], design: 'Ticket-crest pattern', brand: 'adidas', sponsor: 'Standard Chartered', released: '2026-07-29', description: 'White base with maroon-red marks, collar and cuff striping, and a shield-style crest pattern inspired by 1970s tickets.', sourceUrl: 'https://www.footballkitarchive.com/liverpool-fc-2026-27-away-kit-449840/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/07/29/p4UVOkdcadoNCvu/liverpool-fc-2026-27-away-kit.jpg' }),
        kit({ id: 'third', bg: '#111111', accent: '#7F1734', text: '#FFFFFF', colorNames: ['Black', 'Claret', 'White'], design: 'Abstract graphic', brand: 'adidas', sponsor: 'Standard Chartered', released: '2026-08-27', description: 'Black base carrying a dynamic maroon abstract pattern with white shoulder stripes and chest marks.', sourceUrl: 'https://www.footballkitarchive.com/liverpool-fc-2026-27-third-kit-450647/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/08/27/brwalHb7pWGdEF0/liverpool-fc-2026-27-third-kit.jpg' }),
    ],
    'Arsenal': [
        kit({ id: 'home', bg: '#D60322', accent: '#FFFFFF', text: '#FFFFFF', colorNames: ['Red', 'White', 'Navy'], design: 'Contrasting sleeves', brand: 'adidas', sponsor: 'Emirates', released: '2026-05-15', description: 'Red-and-white shirt with a monochrome crest and navy zig-zag collar and cuff detailing.', sourceUrl: 'https://www.footballkitarchive.com/arsenal-fc-2026-27-home-kit-441205/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/05/26/BB9mhr3AQdBMYS2/arsenal-fc-2026-27-home-kit.jpg' }),
        kit({ id: 'away', bg: '#102B62', accent: '#D6A900', text: '#FFFFFF', colorNames: ['Navy', 'Yellow', 'Red'], design: 'Graphic', brand: 'adidas', sponsor: 'Emirates', released: '2026-07-24', description: 'Navy base with a repeating pattern, gold marks and shoulder stripes, and red-gold collar and cuff trim.', sourceUrl: 'https://www.footballkitarchive.com/arsenal-fc-2026-27-away-kit-441204/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/07/27/etWT8L8dncqECVy/arsenal-fc-2026-27-away-kit.jpg' }),
        kit({ id: 'third', bg: '#F1D86E', accent: '#102B62', text: '#102B62', colorNames: ['Pale yellow', 'Navy', 'Claret'], design: 'Lightning graphic', brand: 'adidas', sponsor: 'Emirates', released: '2026-08-03', description: 'Pale-yellow base with navy marks, a lightning motif, and dark-red collar and cuff trim.', sourceUrl: 'https://www.footballkitarchive.com/arsenal-fc-2026-27-third-kit-441203/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/08/03/u1RD9nwP13Lnu4i/arsenal-fc-2026-27-third-kit.jpg' }),
    ],
    'Chelsea': [
        kit({ id: 'home', bg: '#034694', accent: '#FFD700', text: '#FFFFFF', colorNames: ['Blue', 'Yellow'], design: 'Classic collar', brand: 'Nike', sponsor: 'Circle Internet Group', released: '2026-08-28', description: 'Predominantly blue shirt with a classic collar and yellow on the crest, Swoosh, and sponsor.', sourceUrl: 'https://www.footballkitarchive.com/chelsea-fc-2026-27-home-kit-514369/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/09/25/tj9Ynli0qVi17FB/chelsea-fc-2026-27-home-kit.jpg' }),
        kit({ id: 'away', bg: '#111111', accent: '#FFD700', text: '#FFFFFF', colorNames: ['Black', 'Gold'], design: 'Pinstripes', brand: 'Nike', sponsor: 'Circle Internet Group', released: '2026-08-02', description: 'Black base with yellow collar, cuffs, and side stripes, including a World Champions FIFA badge.', sourceUrl: 'https://www.footballkitarchive.com/chelsea-fc-2026-27-away-kit-514557/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/08/31/9Yo865BtQA6w2bo/chelsea-fc-2026-27-away-kit.jpg' }),
        kit({ id: 'third', bg: '#FFFFFF', accent: '#CF1F36', text: '#123C83', colorNames: ['White', 'Red', 'Blue'], design: 'Fine pinstripes', brand: 'Nike', sponsor: 'Circle Internet Group', released: '2026-09-12', description: 'White base with subtle graphic texture, thin red vertical pinstripes, and blue collar and cuff accents.', sourceUrl: 'https://www.footballkitarchive.com/chelsea-fc-2026-27-third-kit-491981/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/09/14/CnyqW4NSBp5IILI/chelsea-fc-2026-27-third-kit.jpg' }),
    ],
    'Manchester United': [
        kit({ id: 'home', bg: '#DA291C', accent: '#FFFFFF', text: '#FFFFFF', colorNames: ['Red', 'White', 'Black'], design: 'Tri-colour polo collar', brand: 'adidas', sponsor: 'Snapdragon', released: '2026-05-14', description: 'Red shirt with a white-red-black polo collar and matching tri-colour sleeve cuffs.', sourceUrl: 'https://www.footballkitarchive.com/manchester-united-2026-27-home-kit-441195/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/07/08/JVX2V6k3OWR887h/manchester-united-2026-27-home-kit.jpg' }),
        kit({ id: 'away', bg: '#123C83', accent: '#DA291C', text: '#FFFFFF', colorNames: ['Blue', 'White', 'Red'], design: 'Subtle vertical pattern', brand: 'adidas', sponsor: 'Snapdragon', released: '2026-07-22', description: 'Blue base with red shoulder stripes, a subtle vertical pattern, and red-white V-neck and cuff trim.', sourceUrl: 'https://www.footballkitarchive.com/manchester-united-2026-27-away-kit-441196/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/07/22/mmfusBhz4bDiw8z/manchester-united-2026-27-away-kit.jpg' }),
        kit({ id: 'third', bg: '#F4F0E6', accent: '#6E2438', text: '#1D5B47', colorNames: ['Off-white', 'Claret', 'Green'], design: 'Lancashire-rose pattern', brand: 'adidas', sponsor: 'Snapdragon', released: '2026-08-14', description: 'Cream base with a subtle Lancashire-rose pattern, claret collar and cuffs, and dark-green shoulder stripes.', sourceUrl: 'https://www.footballkitarchive.com/manchester-united-2026-27-third-kit-441197/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/08/14/QuquLvXoWfR8djj/manchester-united-2026-27-third-kit.jpg' }),
    ],
    'Tottenham': [
        kit({ id: 'home', bg: '#FFFFFF', accent: '#132257', text: '#132257', colorNames: ['White', 'Navy'], design: 'Diagonal pattern', brand: 'Nike', sponsor: 'AIA', released: '2026-06-19', description: 'White base with a subtle diagonal stripe pattern and dark-blue logo, cuffs, and side stripes.', sourceUrl: 'https://www.footballkitarchive.com/tottenham-hotspur-2026-27-home-kit-470195/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/06/19/sCIQYag1v4bja98/tottenham-hotspur-2026-27-home-kit.jpg' }),
        kit({ id: 'away', bg: '#101426', accent: '#F36C21', text: '#FFFFFF', colorNames: ['Navy', 'Purple', 'Orange'], design: 'Graphic', brand: 'Nike', sponsor: 'AIA', released: '2026-06-19', description: 'Deep-navy Obsidian base with a vibrant purple and orange graphic treatment.', sourceUrl: 'https://www.footballkitarchive.com/tottenham-hotspur-2026-27-away-kit-469492/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/06/19/ZugH1N0Vc2ARGhw/tottenham-hotspur-2026-27-away-kit.jpg' }),
        kit({ id: 'third', bg: '#542A6E', accent: '#FFFFFF', text: '#FFFFFF', colorNames: ['Purple', 'Purple', 'White'], design: 'Two-tone vertical stripes', brand: 'Nike', sponsor: 'AIA', released: '2026-08-11', description: 'Two purple shades in vertical stripes, with a dark-blue polo collar and white marks.', sourceUrl: 'https://www.footballkitarchive.com/tottenham-hotspur-2026-27-third-kit-487876/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/08/12/9qusEPF2p2atJ5B/tottenham-hotspur-2026-27-third-kit.jpg' }),
    ],
    'Newcastle United': [
        kit({ id: 'home', bg: '#111111', accent: '#FFFFFF', text: '#FFFFFF', colorNames: ['Black', 'White', 'Sky blue'], design: 'Uneven vertical stripes', brand: 'adidas', sponsor: 'Knox Hydrate', released: '2026-06-10', description: 'Iconic black-and-white vertical stripes with varying widths and sky-blue collar, cuff, and shoulder detailing.', sourceUrl: 'https://www.footballkitarchive.com/newcastle-united-2026-27-home-kit-441288/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/08/04/PmxrFrkI7dyzpUS/newcastle-united-2026-27-home-kit.jpg' }),
        kit({ id: 'away', bg: '#102B62', accent: '#FFFFFF', text: '#FFFFFF', colorNames: ['Navy', 'White', 'Sky blue'], design: 'Brickwork graphic', brand: 'adidas', sponsor: 'Knox Hydrate', released: '2026-07-24', description: 'Navy base with a Brickwork pattern, retro crest, Trefoil mark, and white-turquoise trim.', sourceUrl: 'https://www.footballkitarchive.com/newcastle-united-2026-27-away-kit-494128/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/07/26/CKx8wDa0UWa1nnN/newcastle-united-2026-27-away-kit.jpg' }),
        kit({ id: 'third', bg: '#B7A4C9', accent: '#542A6E', text: '#2A173F', colorNames: ['Light purple', 'Dark purple'], design: 'Subtle all-over pattern', brand: 'adidas', sponsor: 'Knox Hydrate', released: '2026-08-13', description: 'Powder Plum base with dark-purple V-neck, cuffs, shoulder stripes, and subtle patterning.', sourceUrl: 'https://www.footballkitarchive.com/newcastle-united-2026-27-third-kit-503098/', imageUrl: 'https://www.footballkitarchive.com/cdn/2026/08/24/Zlr73S9AeyVwb6H/newcastle-united-2026-27-third-kit.jpg' }),
    ],
};

export const VERIFIED_KIT_CLUBS = Object.freeze(Object.keys(VERIFIED_KITS_BY_CLUB));

export function getSeasonKitThemes(teamName: string): readonly SeasonKitTheme[] {
    return VERIFIED_KITS_BY_CLUB[teamName] || [];
}

export function hasVerifiedSeasonKits(teamName: string): boolean {
    return getSeasonKitThemes(teamName).length > 0;
}
