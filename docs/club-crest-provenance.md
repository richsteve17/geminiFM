# Club crest provenance

The identity registry at `src/data/clubIdentity.ts` resolves exact game-team names to local files under `public/assets/crests/`. The application never uses a remote image URL at runtime. Each packaged asset has an immutable upstream source URL and SHA-256 in both `scripts/club-crest-manifest.json` and the exported `CLUB_IDENTITY_ASSET_PROVENANCE` list.

Run `python3 scripts/import_club_crests.py` from the project root to reproduce the import. The script has no third-party Python dependencies. It uses fixed source snapshots, explicit game-name-to-catalogue maps, bounded retries, SVG/XML and PNG structural validation, and content hashing. It does not search for club names, apply fuzzy matching, synthesize artwork, or replace a missing crest with another club's image. Run `python3 scripts/import_club_crests.py --check` to validate all 82 club crests, 64 national flags, their local formats, and SHA-256 values without network access.

## Crest source

Seventy-five club crests come from the archived [FCLOGO catalogue](https://github.com/FCLOGO/fclogo.top) at commit `b82b63a4c5a2032215edd1ccb0ab4a3b618f6301` (archived on 2025-08-11). FCLOGO is a catalogued collection of vector football logos. Its `logo.yaml` records provide an asset's catalogue ID, version, full-colour style, historical/current marker, source reference, and SVG path. The importer selects only a single record with `style: color`, `isDoubtful: false`, and `isOutdated: false`; if a source entry is missing or has more than one qualifying record, it fails rather than guessing.

The remaining seven English club crests use the public [football-logos.cc England album](https://football-logos.cc/england/). Its explicit entries provide each displayed club name, catalogue ID, CDN asset URL, PNG asset suffix, and SVG hash. `FOOTBALL_LOGOS_ENGLAND_ALIASES` is a seven-entry exact game-name map; `West Brom` is explicitly mapped to the displayed `West Bromwich Albion`, while the other six names are identical. The importer downloads only those seven fixed 256×256 PNG URLs and records their CDN suffixes plus SHA-256 values. It does not construct a slug or infer an alternate club.

The related [football-logos repository](https://github.com/Leo4815162342/football-logos) is pinned at commit `d94162a038024fd2fb378333432076c60646f1e0`, the snapshot inspected for the public catalogue context. That repository contains country-level promotional images rather than the individual English club assets. For that reason, the per-asset source URL is the exact public CDN URL from the England album, while the manifest preserves both the repository commit and the CDN/content hashes. This is an asset-catalogue snapshot, not a certification that every supplied mark is a club's current emblem for any particular season.

## National-team identities

International teams use national flags, not fabricated federation crests. The 64 flags are local SVGs from [Flag Icons](https://github.com/lipis/flag-icons) at commit `ac7e0eb3259eb62aa6100c435607e2fe03896a97`, using its explicit ISO-style `flags/4x3/*.svg` names. The manifest records the specific code and immutable source URL for each flag. This applies to the game’s current international names only.

## Coverage

The game has 82 playable club names in `TEAMS`. All 82 resolve through `getClubIdentity()` to a local crest: 75 FCLOGO SVGs and seven explicitly mapped football-logos.cc PNGs. `CLUB_IDENTITY_COVERAGE.missingClubNames` is empty. All 64 currently configured international team names have local national-flag identities.

## Rights and use

Do not treat this repository’s local packaging as a grant of club-mark rights. Club crests are generally protected by trademark, copyright, and other brand rights held by the relevant clubs or rights holders. FCLOGO’s repository has an MIT software license, but FCLOGO’s published terms state that displayed content is for personal, non-commercial use and that much of it is protected by copyright and trademark; individual imported SVGs may also contain a `PERSONAL USE ONLY NOT FOR COMMERCIAL USE` notice. Any distribution, commercial use, modification, or public deployment needs an independent rights review and, where required, permission from the relevant club/rightsholder.

Flag Icons is MIT-licensed as a software collection, but that is not a blanket legal conclusion about every underlying national flag design or local law. The imported assets represent national flags only; they are not claims to federation marks or team badges. Retain this provenance file and reassess rights before a use that exceeds the applicable source terms.

This record does not assert a licence for the football-logos.cc catalogue assets or grant rights in those club marks. The source page's availability and asset hashes establish traceability, not permission. Obtain an independent rights review before distribution, commercial use, modification, or public deployment.

## Source links

- [FCLOGO repository and source catalogue](https://github.com/FCLOGO/fclogo.top)
- [FCLOGO terms of use](https://fclogo.top/terms-of-use/)
- [Flag Icons repository](https://github.com/lipis/flag-icons)
- [football-logos.cc England catalogue](https://football-logos.cc/england/)
- [football-logos project repository](https://github.com/Leo4815162342/football-logos)
- [Generated per-asset manifest](../scripts/club-crest-manifest.json)
