#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  decodeSourceDocuments,
  parseFkaCatalog,
} from "./kit_sources/fka.mjs";

const fixturePath = process.argv[2] ?? new URL("./kit_sources/fixtures/ligue1-2026-27.html", import.meta.url);
const firecrawlPath = process.argv[3];
const sourceUrl = "https://www.footballkitarchive.com/ligue-1-kits-2026-27-l177/";

const html = await readFile(fixturePath, "utf8");
const parsed = parseFkaCatalog({ html, sourceUrl });

assert.equal(parsed.summary.catalogCardsFound, 89, "the fixture has 89 collection-card kit anchors after excluding rank widgets");
assert.equal(parsed.records.length, 51, "default selection keeps only home/away/third cards");
assert.equal(parsed.summary.sourceTeamsEmitted, 18, "all 18 Ligue 1 source teams are represented");
assert.equal(parsed.records.every((record) => record.kit.season === "2026/27"), true);
assert.equal(parsed.records.every((record) => ["home", "away", "third"].includes(record.kit.type)), true);
assert.equal(parsed.records.every((record) => record.publication.officiallyConfirmed === null), true);
assert.equal(parsed.records.every((record) => record.verifiedContent.thumbnailOnly === true), true);
assert.equal(parsed.records.every((record) => record.source.evidence.image.selectedUrl.includes("/cdn/")), true);
assert.equal(parsed.records.every((record) => record.absentFields.includes("officialReleaseDate")), true);

const auxerreHome = parsed.records.find((record) => record.source.kitPageUrl === "https://www.footballkitarchive.com/aj-auxerre-2026-27-home-kit-494248/");
assert.ok(auxerreHome, "the real AJ Auxerre home-card URL is selected from the seasonal collection");
assert.equal(auxerreHome.team.sourceName, "AJ Auxerre");
assert.equal(auxerreHome.kit.type, "home");
assert.equal(auxerreHome.source.teamArchiveId, "81");
assert.equal(auxerreHome.source.evidence.image.dataSrc, "https://www.footballkitarchive.com/cdn/2026/07/09/E0Ey4mrnwFHTHeu-small/aj-auxerre-2026-27-home-kit.jpg");

const envelope = firecrawlPath ? await readFile(firecrawlPath, "utf8") : JSON.stringify({ structuredContent: { html, metadata: { sourceURL: sourceUrl, statusCode: 200 } } });
const documents = decodeSourceDocuments(envelope);
assert.equal(documents.length, 1, "the nested Firecrawl envelope decodes to one de-duplicated HTML document");
assert.equal(documents[0].metadata.sourceURL, sourceUrl);

process.stdout.write(JSON.stringify({
  fixturePath,
  cards: parsed.summary.catalogCardsFound,
  records: parsed.records.length,
  sourceTeams: parsed.summary.sourceTeamsEmitted,
  envelopeDocuments: documents.length,
}) + "\n");
