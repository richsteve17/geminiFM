# xGaffer '28 — roster release, 2026-11-07

## Delivered

The product identity is **xGaffer '28**, approved by the owner. The edition label is separate from the 2026/27 source season, MLS calendar-year data and the 2026 World Cup tutorial. The existing career/profile keys are retained.

Fresh careers use 82 current-source club squads with **2,538 unique provider identities**, no missing/partial club membership and no unresolved player records. Import concurrency was capped at four; 13 observed inventories and all 82 roster responses are retained in the date-isolated cache. The committed source snapshot is reproducible from that cache. Source membership is kept distinct from the curated game competition catalog; eleven old catalog league labels differ from observed source leagues.

The tutorial uses the corrected owner-supplied **48 squads / 1,244 players**. Both supplied files were copied byte-for-byte. The Jordan Ibrahim Sabra and Panama Tomas Rodriguez rows remain exactly as supplied; the metadata block does not replace the causal goal/penalty/stakes/participation relationship design. Shared source/dataset identities link club and national copies without inventing provider IDs.

Current source membership, source dates, names, DOB/age and available squad numbers are factual inputs. Ratings, personalities, economics and unsupported detailed role/age estimates remain versioned game derivations. Unknown source ages are visibly marked as estimates in player/market screens. The full source bench is retained rather than reduced to a 25-player roster.

## Save and recruitment fixes

Continue restores its own saved football timeline, not the new catalog. Transfers, ages, contracts, balances, stats/history, tutorial rewards, fixtures, active playback and relationships remain career state. Raw duplicate club/national source payloads are omitted from saves, but identity/provenance and derived-status labels remain.

One actual fresh club-world save measured 5,384,032 bytes raw, 2,832,965 bytes after source compaction, and 320,540 bytes in the gzip/base64 storage envelope. A separately measured compressed roundtrip restored all 2,538 players. Measurements are from the Sandbox, not an iPhone hardware benchmark; save size changes with career contents. Compression uses the existing pinned [fflate](https://github.com/101arrowz/fflate) library bundled with Three.js. Legacy plain JSON still loads; backup quota failure is nonfatal.

One read-only integration review found two actual regressions introduced by the larger source squads: the 25-player ownership limit disabled recruitment at 80 clubs, and a duplicate backup could prevent Continue when quota was tight. Both were fixed. Owned-roster game capacity is now 60, distinct from competition senior-registration limits. Source squads are not truncated; the explicit cap and financial checks remain enforced.

Fresh free-agent markets contain the supplied explicitly unattached Ehsan Haddad and Saed Al-Rosan, then actual in-career releases. Unknown clubs do not imply free agency, and stale seed transfer targets are not inserted into new careers. Existing market history is retained on Continue.

## Scope retained

The current paper/ink/forest interface, authentic club/kit assets, skinned footballers, stadium audio, tutorial access gates and causal international-return mechanics are retained. Full current league-membership expansion, wider verified free-agent coverage, validated live-scout entity import, server-authoritative persistence and complete world/regen/atmosphere coverage remain separate outstanding work. This release is saved as Preview; it does not imply permanent publication.

Source contracts are in `club-roster-provenance.md`, `club-roster-hydration.md`, and `world-cup-roster-integration.md`. The supplied JSON itself was not re-audited for football accuracy.
