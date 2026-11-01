# 2026/27 Kit Source Ledger

**Scope:** Homepage kit picker records imported in build `3.1.2`.

**Catalog source:** [Football Kit Archive — Premier League 2026-27](https://www.footballkitarchive.com/premier-league-kits-2026-27-l224/)

Each rendered card stores a direct source URL and the source page's Open Graph kit image. The records below were extracted on 2026-10-10. This ledger is provenance, not a licensing grant.

| Club | Kit | Source facts imported | Source |
| --- | --- | --- | --- |
| Manchester City | Home | Sky blue / white; gradient; Puma; Etihad Airways; released 2026-05-20 | [Record](https://www.footballkitarchive.com/manchester-city-2026-27-home-kit-441641/) |
| Manchester City | Away | Black / gold; worker-bee graphic; Puma; Etihad Airways; released 2026-07-31 | [Record](https://www.footballkitarchive.com/manchester-city-2026-27-away-kit-486529/) |
| Manchester City | Third | White / blue / sky blue; single stripe; Puma; Etihad Airways; released 2026-08-27 | [Record](https://www.footballkitarchive.com/manchester-city-2026-27-third-kit-427765/) |
| Liverpool | Home | Active maroon / white; geometric graphic; adidas; Standard Chartered; released 2026-05-19 | [Record](https://www.footballkitarchive.com/liverpool-fc-2026-27-home-kit-448385/) |
| Liverpool | Away | White / maroon red; ticket-crest pattern; adidas; Standard Chartered; released 2026-07-29 | [Record](https://www.footballkitarchive.com/liverpool-fc-2026-27-away-kit-449840/) |
| Liverpool | Third | Black / claret / white; abstract graphic; adidas; Standard Chartered; released 2026-08-27 | [Record](https://www.footballkitarchive.com/liverpool-fc-2026-27-third-kit-450647/) |
| Arsenal | Home | Red / white / navy; contrasting sleeves; adidas; Emirates; released 2026-05-15 | [Record](https://www.footballkitarchive.com/arsenal-fc-2026-27-home-kit-441205/) |
| Arsenal | Away | Navy / yellow / red; graphic; adidas; Emirates; released 2026-07-24 | [Record](https://www.footballkitarchive.com/arsenal-fc-2026-27-away-kit-441204/) |
| Arsenal | Third | Pale yellow / navy / claret; lightning graphic; adidas; Emirates; released 2026-08-03 | [Record](https://www.footballkitarchive.com/arsenal-fc-2026-27-third-kit-441203/) |
| Chelsea | Home | Blue / yellow; classic collar; Nike; Circle Internet Group; released 2026-08-28 | [Record](https://www.footballkitarchive.com/chelsea-fc-2026-27-home-kit-514369/) |
| Chelsea | Away | Black / gold; pinstripes; Nike; Circle Internet Group; released 2026-08-02 | [Record](https://www.footballkitarchive.com/chelsea-fc-2026-27-away-kit-514557/) |
| Chelsea | Third | White / red / blue; fine pinstripes; Nike; Circle Internet Group; released 2026-09-12 | [Record](https://www.footballkitarchive.com/chelsea-fc-2026-27-third-kit-491981/) |
| Manchester United | Home | Red / white / black; tri-colour polo collar; adidas; Snapdragon; released 2026-05-14 | [Record](https://www.footballkitarchive.com/manchester-united-2026-27-home-kit-441195/) |
| Manchester United | Away | Blue / white / red; subtle vertical pattern; adidas; Snapdragon; released 2026-07-22 | [Record](https://www.footballkitarchive.com/manchester-united-2026-27-away-kit-441196/) |
| Manchester United | Third | Off-white / claret / green; Lancashire-rose pattern; adidas; Snapdragon; released 2026-08-14 | [Record](https://www.footballkitarchive.com/manchester-united-2026-27-third-kit-441197/) |
| Tottenham | Home | White / navy; diagonal pattern; Nike; AIA; released 2026-06-19 | [Record](https://www.footballkitarchive.com/tottenham-hotspur-2026-27-home-kit-470195/) |
| Tottenham | Away | Navy / purple / orange; graphic; Nike; AIA; released 2026-06-19 | [Record](https://www.footballkitarchive.com/tottenham-hotspur-2026-27-away-kit-469492/) |
| Tottenham | Third | Two purple shades / white; vertical stripes; Nike; AIA; released 2026-08-11 | [Record](https://www.footballkitarchive.com/tottenham-hotspur-2026-27-third-kit-487876/) |
| Newcastle United | Home | Black / white / sky blue; unequal vertical stripes; adidas; Knox Hydrate; released 2026-06-10 | [Record](https://www.footballkitarchive.com/newcastle-united-2026-27-home-kit-441288/) |
| Newcastle United | Away | Navy / white / sky blue; Brickwork graphic; adidas; Knox Hydrate; released 2026-07-24 | [Record](https://www.footballkitarchive.com/newcastle-united-2026-27-away-kit-494128/) |
| Newcastle United | Third | Light purple / dark purple; subtle all-over pattern; adidas; Knox Hydrate; released 2026-08-13 | [Record](https://www.footballkitarchive.com/newcastle-united-2026-27-third-kit-503098/) |

## Import rule

A club not present in `src/data/seasonThemes.ts` must display the explicit **unverified** state. Do not derive a “current kit” by reusing `Team.colors` or a prior-season strip.

## Build 3.2.1 expansion — 2026-11-01

The runtime now imports `src/data/seasonKitCatalog.json`, with **235 locally packaged photographs across all 82 playable clubs**. All clubs have a sourced home reference; only variants actually present in the source albums are shown. Missing away/third references are not invented. MLS cards use `2026`; European cards use `2026/27`.

Each card retains its individual archive record URL, original image URL, album URL, palette provenance and an explicit `archive-reference` publication status. Source-card metadata does not establish official release dates, sponsors or suppliers, so those newly imported fields remain null. The reviewed seven-club facts above are retained rather than erased by the bulk image import. Newly sampled UI palettes are approximations, not supplier-certified colour specifications.

`docs/kit-asset-manifest-2026.json` contains every asset’s original SHA-256, original/packaged dimensions, byte count and source URLs. The packaging code uses local content-versioned WebP files, preserves source aspect ratio, never upscales and does not change kit artwork. Runtime photo rendering therefore does not depend on an external archive hotlink.

### Repeatable import

Run `node scripts/kit-import.mjs --help` for the deterministic source-album import. Parser regression: `node scripts/kit-import.test.mjs` uses the repository’s saved source fixture. `scripts/package-kit-assets.py` packages the candidate JSON; normal runs reuse matching verified local snapshots, and `--refresh` deliberately re-fetches them. Required Python packages: requests, Pillow, numpy. Source retrieval and explicit name aliases are separate from UI rendering. Source documents with non-200 status, mismatched seasons or ambiguous primary-kit identity do not become valid cards.

The source-supported asset snapshot and metadata are not a licence to club trademarks or photography; individual provenance is retained for the project’s existing rights review.
