# Roster refresh source notes — 7 November 2026

The corrected owner-supplied World Cup files are the authority for tournament squad membership and their supplied football fields. The enriched file supplies exact roles, national membership, clubs and leagues. The base file remains a reference counterpart. Their descriptive metadata is not a replacement for the game's causal international relationship design.

Club roster refresh uses the existing structured ESPN pipeline. Endpoint documentation: https://github.com/pseudo-r/Public-ESPN-API/blob/main/docs/sports/soccer.md . The documented site API exposes league team inventories and `teams/{resolved-id}/roster`. Resolve IDs from inventories and inspect the returned source season; a new retrieval timestamp alone does not turn an old squad into a current-season roster. Current source league metadata remains distinct from the game's curated seven-league club catalog.

The ’28 label is an edition decision, not a new timestamp on the roster source. Replacement product naming is pending owner input. Existing careers remain their own simulated timelines; newly imported rosters are fresh-career baselines only.
