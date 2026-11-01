# Visual asset source discovery — 2026-11-01

Existing verified catalog: `src/data/seasonThemes.ts` contains 21 FKA records across 7 clubs. Other selectable clubs currently return no kit record. Existing external kit image links are hotlinked and have no failure presentation.

Discovered sources, not yet claimed imported:

- https://www.footballkitarchive.com/ — season/club kit records, source page metadata and kit images.
- https://www.footballkitarchive.com/serie-a-kits-2026-27-l258/
- https://www.footballkitarchive.com/ligue-1-kits-2026-27-l177/
- https://www.footyheadlines.com/26-27-kit-overview/ — mixes leaked and released kits; leaks must not be represented as confirmed released kits.
- https://github.com/FCLOGO/fclogo.top — authentic club-vector-logo repository.
- https://www.footylogos.com/ — secondary club and national crest source.
- https://football-logos.cc/ — secondary crest source.

Image search returned authentic product/club-store references for Tottenham, Barcelona, Chelsea, Manchester City and Atlanta United. Product references are selected using the search thumbnail catalog; no AI-generated substitute will be represented as an authentic kit. Supplied faces/model photography must not be turned into game player portraits.

Current scope: homepage current-season kit records plus squad-header identity and UI icon quality. Pitch-player jersey rendering is explicitly excluded by the owner's clarification.

## Corrected bulk album sources

The initial saved La Liga/Bundesliga/MLS catalog IDs were wrong and returned 404. Successfully extracted current records from these exact album URLs: [Premier League](https://www.footballkitarchive.com/premier-league-kits-2026-27-l224/), [Championship](https://www.footballkitarchive.com/championship-kits-2026-27-l61/), [La Liga](https://www.footballkitarchive.com/la-liga-kits-2026-27-l150/), [Serie A](https://www.footballkitarchive.com/serie-a-kits-2026-27-l258/), [Bundesliga](https://www.footballkitarchive.com/bundesliga-kits-2026-27-l34/), [Ligue 1](https://www.footballkitarchive.com/ligue-1-kits-2026-27-l177/), [Ligue 2](https://www.footballkitarchive.com/ligue-2-kits-2026-27-l178/), and [MLS 2026](https://www.footballkitarchive.com/mls-kits-2026-l187/).

The imported source cards identify the club, season, variant and photo URL. They do **not** establish an official release date, sponsor, supplier or supplier-certified colour specification. These fields stay null when absent; newly sampled UI colours are explicitly approximate. Kit photography is re-encoded with its aspect ratio preserved, without upscaling or artwork changes.

Extra coverage: [Leicester club album](https://www.footballkitarchive.com/leicester-city-kits-2026-27-t11/) and [2. Bundesliga](https://www.footballkitarchive.com/2-bundesliga-kits-2026-27-l2/) contain the current Leicester/Wolfsburg records missing from their inherited game divisions. [Girona home-kit release](https://www.footyheadlines.com/2026/05/new-girona-26-27-home-kit.html) confirms a current home shirt and points to lower-division coverage; this is not used to silently change the game's league membership.

Supplementary structured crest collection discovered for the seven missing Championship crests: https://github.com/Leo4815162342/football-logos. Authentic crest assets retain their individual source and rights provenance; code-repository licensing is not treated as a blanket licence to club trademarks.
