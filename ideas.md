# Manus FM — Football editorial / club office

The November 2026 screenshots demonstrate that previous updates left the Gemini-era layout intact. The approved next change is a whole-interface aesthetic redesign, not another asset swap or palette-only reskin.

## Direction

Football editorial and the professional club office: chalk-white paper, dark evergreen/ink, condensed sports typography, ruled tables, compact folios, authentic club identity, and a contrasting broadcast match panel. No oversized centered glowing logo, navy glass-card wall, fake terminal hero badges, rainbow navigation or marketing copy invention. Reuse existing factual game labels and descriptions.

A compact masthead leads into an asymmetric home: career actions and saved-game information are immediately usable; authentic stadium photography occupies a deliberate visual region, with source attribution and no false claim that it is the selected club's stadium. Kits remain an archive with real photographs and explicit theme accents. AI/cost settings and the real release record remain accessible but do not dominate the first screen.

In-game: persistent club workspace at desktop, accessible compact navigation on phones, clear screen titles, a large broadcast match frame, data-led squad/transfer surfaces and structured staff/conversation layouts. Every screen inherits shared typography, buttons, forms, surfaces and feedback states. Major screens also change their composition, not merely their colours.

## Implementation

Use shared semantic classes/tokens in `src/interface.css`. Keep existing callbacks, state, accessible controls, error/loading states, source metadata and all simulation/AI/audio/save/contract/tutorial logic. Scope the broadcast's dark surfaces explicitly so general paper styling does not make the pitch or its controls unreadable. Club-selected colours apply to identity/theme accents without reintroducing full-screen glow.

Responsive typography and safe-area-aware controls; readable data numbers and 44px primary touch targets. Barlow Condensed headings and IBM Plex Sans body text, with system fallbacks. Source-backed photos/crests/kits remain genuine; no fake player portraits, invented shirts, scores or roster facts.
