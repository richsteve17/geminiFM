# Economics Deck Notes

## Slide 1: The Two-Line Story
- Monthly sub crosses FIFA at month 4 unless priced like a season.
- COGS per season is roughly $4.49 with video + TTS + search, so packaging is the game.

## Slide 2: Consumer Comparison (10-Month Sep-Jul)
| Timeline | FIFA / FC 25 | GFM '27 ($19.99/mo) | Status |
|---|---:|---:|---|
| Month 1 | $70.00 | $19.99 | GFM cheaper |
| Month 3 | $70.00 | $59.97 | GFM cheaper |
| Month 4 | $70.00 | $79.96 | Crossover |
| Month 10 | $70.00 | $199.90 | GFM 2.8x |

## Slide 3: COGS Inputs (Replicable)
- Text sim: $0.0003 per 10-minute chunk (2k in / 500 out)
- Search grounding: $0.035 per query
- TTS commentary: $0.005 per 15s clip
- Video replay: $0.08 per 5s clip
- Usage/season: 100 TTS, 20 search, 38 video, $0.25 text
- COGS/season: $4.49 (or ~$4.42 with 15% TTS cache)

## Slide 4: Creator Economics (Shorts)
- Viral clip unit cost: $0.09
- Shorts RPM: $0.03 / 1,000 views
- Per-clip break-even: ~3,000 views

## Slide 5: Break-Even Views (Includes Clip COGS)
Formula:

Break-even views/month = ((Subscription + 0.09 * clips_per_month) / 0.03) * 1000

Examples:
- Creator tier ($14.99, 5 clips/mo): ~514,667 views/month
- Studio tier ($24.99, 30 clips/mo): ~923,000 views/month

## Slide 6: Packaging (Video as Premium Dial)
Core Manager ($6.99/mo or $59/season)
- Beats FIFA over full season
- Text sim: unlimited
- Scouting: 2/mo
- TTS: 10/mo
- Video: 0

Creator ($14.99/mo)
- Text sim: unlimited
- Scouting: 10/mo
- TTS: 100/mo
- Video: 5/mo
- Add-on: $4.99 for +25 replay credits

Studio ($24.99/mo)
- Text sim: unlimited
- Scouting: 50/mo
- TTS: unlimited
- Video: 30/mo

## Slide 7: Risk Controls
- Storage/egress: short clips, TTL URLs, CDN caching, hard caps
- Retry overhead: model 10% COGS buffer, de-dupe by event ID
- Prompt size: rolling window + summaries to prevent token creep
- Search: memoize by query + filters + week
- Concurrency: queue media jobs, debounce UI actions