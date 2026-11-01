# Pitch-player model — 3.2.2

The rendered player uses Hiamboz’s **stylized human basemesh** from https://hiamboz.itch.io/human-body-base-mesh, whose published catalog licence is **CC0-1.0**. It is a generic anatomical model, not a real footballer’s face scan or claimed likeness.

The exact chosen catalog member is `stylized_human_basemesh_mtype.glb`, with SHA-256 `63747ff30fd1f02fe2bbff5f9e48e6d2a829e999d5c903ec819bd3b06ba65a5a`. The source archive SHA-256 is `b8f23d5610f9845ca84e31e3bd02d64d54bd5b4944a24518231a09f87a6a6d1d`, from catalog snapshot `catalog-20260924-japan-characters-scene-removal-v1`. The alternative Prototyping Mannequin was inspected but not shipped.

## Runtime adaptation

`scripts/build-footballer.mjs` keeps the source anatomical skin geometry, omits the separate internal face/eye meshes, and adds a 16-bone visual skeleton, normalized weights, garment regions and source-photo projection coordinates. The source had no authored rig or animations: those are this project’s deterministic adaptation, not claimed source features. The derivative `/models/footballer-v1.glb` contains 6,974 vertices, 12,296 triangles, no embedded images and 581,416 bytes. Its exact SHA-256, bone pivots and source lineage are in `docs/footballer-adaptation.json`.

Run the adaptation with the pinned source member: `node scripts/build-footballer.mjs /absolute/path/stylized_human_basemesh_mtype.glb`. Source masters and private access receipts stay outside the project; the chosen runtime derivative is committed and has no runtime catalog/network dependency.

## Clothing and identity

The existing `src/data/seasonKitCatalog.json` supplies the locally packaged current-season shirt photographs and source URLs. Two 192×256 fabric canvases crop the central photographed shirt panels; the anatomical body receives a projected reference, not a reconstructed manufacturer UV garment. Shorts, socks, back panels, goalkeeper colours and generic appearance are explicitly approximate. No sponsor, official goalkeeper-kit specification, skin/hair identity or verified player squad number is invented. The back numbers identify current lineup slots 1–11, and the pitch caption says so. Actual source/photo selection preserves club and season identity and uses sourced alternatives when colours clash.

The match renderer shares one geometry across its player clones, gives each player an independent skeleton, and uses a single small shirt-number atlas. Frame-pose math derives gait from actual display displacement, gates actor poses by team/actor identity, and gates goalkeeper saves by the resolved `saved` outcome. Pausing does not advance that visual clock, ball path, joints or goal banner; deliberately changing the camera remains available. Simulation, scores, contracts, AI, stadium audio and career save data are unchanged by this presentation module.

## Verification evidence

The derivative loads through the actual GLTFLoader with normalized skin weights and shader-compatible `_clothregion` / `_restposition` attributes. The local game serves the identical 581,416-byte GLB, and the production build includes it. Actual browser kickoff rendered the new players with a live WebGL2 context, no context loss and no renderer alert. Independent connection review found a same-named opposing goalkeeper actor collision; the team-side guard was corrected and a regression added. A phone-device frame-rate claim is not made: geometry/texture budgets are bounded, but iPhone hardware performance has not been measured.
