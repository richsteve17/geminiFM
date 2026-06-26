# Economics Notes

## Core Story (Two-Line)
- Monthly sub crosses FIFA at month 4 unless priced like a season.
- COGS per season is roughly $4.49 with video + TTS + search, so packaging is the game.

## Inputs (Replicable Specs)
**Season length:** 10 months (Sep-Jul), 38 matches
**FIFA baseline:** $70 flat
**Subscription baseline:** $19.99/mo

**Model costs**
- Text sim: $0.0003 per 10-minute chunk (2k in / 500 out)
- Search (grounding): $0.035 per query
- TTS commentary: $0.005 per 15-second clip
- Video replay: $0.08 per 5-second clip

**Normal tier usage (per season)**
- TTS: 100 clips
- Search: 20 queries
- Video: 38 clips (1 per match)
- Text sim: $0.25 per season (baseline)

**Caching**
- TTS cache hit: 15%
- Video cache: 100% on re-watch (generate once per event)

## COGS Summary (Normal $19.99 Tier)
- Text: $0.25
- TTS: $0.50 (100 * 0.005) -> ~$0.43 with 15% cache
- Search: $0.70 (20 * 0.035)
- Video: $3.04 (38 * 0.08)
- Total: ~$4.49 (or ~$4.42 with TTS cache)

## Consumer Comparison (10-Month Cycle)
- Month 1: FIFA $70 vs GFM $19.99
- Month 3: FIFA $70 vs GFM $59.97
- Month 4: FIFA $70 vs GFM $79.96 (crossover)
- Month 10: FIFA $70 vs GFM $199.90

## Creator Economics
**Viral clip unit cost:** $0.09 (video $0.08 + audio $0.005 + text rounding)
**Shorts RPM:** $0.03 per 1,000 views

**Per-clip break-even**
- $0.09 / ($0.03 / 1000) = ~3,000 views

**Break-even views per month (includes clip COGS)**

Break-even views/month = ((Subscription + 0.09 * clips_per_month) / 0.03) * 1000


Examples:
- Creator tier ($14.99, 5 clips/mo): (14.99 + 0.45) / 0.03 * 1000 = ~514,667 views/mo
- Studio tier ($24.99, 30 clips/mo): (24.99 + 2.70) / 0.03 * 1000 = ~923,000 views/mo

## Recommended Packaging (Video as Premium Dial)
**Core Manager ($6.99/mo or $59/season)**
- Beats FIFA over full season
- Text sim: unlimited
- Scouting: 2/mo
- TTS: 10 clips/mo
- Video: 0

**Creator ($14.99/mo)**
- Text sim: unlimited
- Scouting: 10/mo
- TTS: 100 clips/mo
- Video: 5 clips/mo
- Add-on: $4.99 for +25 replay credits

**Studio ($24.99/mo)**
- Text sim: unlimited
- Scouting: 50/mo
- TTS: unlimited
- Video: 30 clips/mo

## Risk Controls (Slide-Ready)
- Storage/egress: short clips, TTL URLs, CDN caching, hard caps
- Retry overhead: model 10% COGS buffer, de-dupe by event ID
- Prompt size: rolling window + summaries to prevent token creep
- Search: memoize by query + filters + week
- Concurrency: queue media jobs, debounce UI actions