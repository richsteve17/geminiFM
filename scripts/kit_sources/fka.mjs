import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import * as parse5 from "parse5";

export const SOURCE_NAME = "Football Kit Archive";
export const SOURCE_ID = "football-kit-archive";

/**
 * These are the requested primary source catalog pages. The importer also accepts another
 * FKA league catalog URL when its path explicitly identifies 2026-27 or MLS 2026.
 */
export const FKA_2026_CATALOG_SOURCES = Object.freeze([
  { league: "Premier League", season: "2026/27", url: "https://www.footballkitarchive.com/premier-league-kits-2026-27-l224/" },
  { league: "Serie A", season: "2026/27", url: "https://www.footballkitarchive.com/serie-a-kits-2026-27-l258/" },
  { league: "La Liga", season: "2026/27", url: "https://www.footballkitarchive.com/la-liga-kits-2026-27-l140/" },
  { league: "Bundesliga", season: "2026/27", url: "https://www.footballkitarchive.com/bundesliga-kits-2026-27-l132/" },
  { league: "Ligue 1", season: "2026/27", url: "https://www.footballkitarchive.com/ligue-1-kits-2026-27-l177/" },
  { league: "Major League Soccer", season: "2026", url: "https://www.footballkitarchive.com/major-league-soccer-kits-2026-l103/" },
]);

const PRIMARY_TYPES = new Set(["home", "away", "third"]);
const ABSENT_CARD_FIELDS = Object.freeze([
  "officialReleaseDate",
  "officialReleaseEvidence",
  "supplier",
  "sponsor",
  "colourNames",
  "hexColours",
  "designDescription",
]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function attribute(node, name) {
  return node?.attrs?.find((item) => item.name === name)?.value ?? null;
}

function classTokens(node) {
  return new Set((attribute(node, "class") ?? "").split(/\s+/).filter(Boolean));
}

function hasClass(node, className) {
  return classTokens(node).has(className);
}

function hasAnyClass(node, classNames) {
  const tokens = classTokens(node);
  return classNames.some((name) => tokens.has(name));
}

function textContent(node) {
  if (!node) return "";
  if (node.nodeName === "#text") return node.value ?? "";
  return (node.childNodes ?? []).map(textContent).join("");
}

function walk(node, visit, ancestors = []) {
  visit(node, ancestors);
  for (const child of node.childNodes ?? []) {
    walk(child, visit, [...ancestors, node]);
  }
}

function descendants(node, predicate) {
  const matches = [];
  walk(node, (candidate) => {
    if (candidate !== node && predicate(candidate)) matches.push(candidate);
  });
  return matches;
}

function firstDescendant(node, predicate) {
  let result = null;
  walk(node, (candidate) => {
    if (!result && candidate !== node && predicate(candidate)) result = candidate;
  });
  return result;
}

function firstTextForClasses(node, classNames) {
  const match = firstDescendant(node, (candidate) => hasAnyClass(candidate, classNames));
  return match ? cleanText(textContent(match)) : null;
}

function isHtml(value) {
  return /<(?:!doctype|html|body|div|a|main)\b/i.test(value);
}

function parseJsonString(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function sourceUrlFromMetadata(value) {
  if (!value || typeof value !== "object") return null;
  return value.sourceURL ?? value.sourceUrl ?? value.url ?? null;
}

/**
 * Returns every HTML document contained in a raw FKA HTML file or a Firecrawl-like JSON
 * envelope. It deliberately preserves the original payload source URL when available.
 */
export function decodeSourceDocuments(rawText) {
  const documents = [];
  const seen = new Set();

  function add(html, metadata = {}) {
    if (typeof html !== "string" || !isHtml(html)) return;
    const key = sha256(html);
    if (seen.has(key)) return;
    seen.add(key);
    documents.push({
      html,
      metadata: metadata && typeof metadata === "object" ? metadata : {},
      payloadSha256: key,
    });
  }

  function visit(value, inheritedMetadata = {}, depth = 0) {
    if (depth > 10 || value === null || value === undefined) return;

    if (typeof value === "string") {
      const trimmed = value.trim();
      const parsed = parseJsonString(trimmed);
      if (parsed !== null) {
        visit(parsed, inheritedMetadata, depth + 1);
        return;
      }
      if (isHtml(trimmed)) add(value, inheritedMetadata);
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) visit(item, inheritedMetadata, depth + 1);
      return;
    }

    if (typeof value !== "object") return;

    const metadata = {
      ...inheritedMetadata,
      ...(value.metadata && typeof value.metadata === "object" ? value.metadata : {}),
    };

    if (typeof value.html === "string") add(value.html, metadata);
    if (typeof value.rawHtml === "string") add(value.rawHtml, metadata);

    // Firecrawl may return either content[].text containing JSON, structuredContent, or data.
    for (const key of ["content", "structuredContent", "data", "results", "pages"]) {
      if (value[key] !== undefined) visit(value[key], metadata, depth + 1);
    }

    // A content item may carry text rather than html.
    if (typeof value.text === "string") visit(value.text, metadata, depth + 1);
  }

  const parsed = parseJsonString(rawText);
  if (parsed === null) add(rawText, {});
  else visit(parsed, {});

  return documents;
}

export async function readSourceFile(filePath) {
  const rawText = await readFile(filePath, "utf8");
  const documents = decodeSourceDocuments(rawText);
  if (documents.length === 0) {
    throw new Error(`${filePath}: no HTML document found in the input file or JSON envelope`);
  }
  return documents.map((document) => ({ ...document, inputPath: filePath }));
}

export function normalizeUrl(value, baseUrl) {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return value;
  }
}

function normalizedUrl(value) {
  try {
    const parsed = new URL(value);
    parsed.hash = "";
    parsed.search = "";
    return parsed.href.replace(/\/$/, "");
  } catch {
    return value?.replace(/\/$/, "") ?? null;
  }
}

function toSeason(value) {
  const match = cleanText(value).match(/^(\d{4})(?:-(\d{2}))?$/);
  if (!match) return null;
  return match[2] ? `${match[1]}/${match[2]}` : match[1];
}

function sourcePathSeason(sourceUrl) {
  try {
    const path = new URL(sourceUrl).pathname;
    const match = path.match(/-kits-(\d{4}(?:-\d{2})?)-(?:l|t)\d+\/?$/i);
    return match ? toSeason(match[1]) : null;
  } catch {
    return null;
  }
}

function sourcePathLeague(sourceUrl) {
  try {
    const path = new URL(sourceUrl).pathname;
    const match = path.match(/^\/([^/]+)-kits-\d{4}(?:-\d{2})?-l\d+\/?$/i);
    if (!match) return null;
    return match[1]
      .split("-")
      .map((part) => (part.length <= 3 ? part.toUpperCase() : `${part[0].toUpperCase()}${part.slice(1)}`))
      .join(" ");
  } catch {
    return null;
  }
}

function pageTitle(document) {
  const titleNode = firstDescendant(document, (node) => node.tagName === "title");
  return titleNode ? cleanText(textContent(titleNode)) : null;
}

function mainTitle(document) {
  return firstTextForClasses(document, ["main-title"]);
}

function sourceIdentity(document, sourceUrl, metadata) {
  const normalized = normalizedUrl(sourceUrl);
  const configured = FKA_2026_CATALOG_SOURCES.find((source) => normalizedUrl(source.url) === normalized);
  const title = metadata?.title ?? mainTitle(document) ?? pageTitle(document) ?? null;
  const expectedSeason = configured?.season ?? sourcePathSeason(sourceUrl) ?? toSeason(title?.match(/\b(\d{4}(?:-\d{2})?)\b/)?.[1]);
  const titleLeague = title?.replace(/\s+\d{4}(?:-\d{2})?\s+Kits.*$/i, "").trim() || null;

  return {
    sourceId: SOURCE_ID,
    sourceName: SOURCE_NAME,
    catalogUrl: sourceUrl ?? null,
    catalogTitle: title,
    league: configured?.league ?? titleLeague ?? sourcePathLeague(sourceUrl),
    expectedSeason,
    sourceIsConfigured: Boolean(configured),
  };
}

function cardSeasonAndType(label) {
  const match = cleanText(label).match(/^(\d{4}(?:-\d{2})?)\s+(.+)$/);
  if (!match) return { season: null, rawType: null, type: null };
  const rawType = cleanText(match[2]);
  const normalizedType = rawType.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return { season: toSeason(match[1]), rawType, type: normalizedType || null };
}

function exactTeamResolution(sourceTeamName, aliases, knownTeamNames) {
  const targetNames = new Set(knownTeamNames);
  const aliasTarget = aliases[sourceTeamName];

  if (targetNames.has(sourceTeamName)) {
    return { targetName: sourceTeamName, method: "exact-name", verified: true };
  }

  if (typeof aliasTarget === "string" && aliasTarget.length > 0) {
    if (targetNames.size === 0 || targetNames.has(aliasTarget)) {
      return { targetName: aliasTarget, method: "explicit-alias", verified: true };
    }
    return { targetName: null, method: "invalid-explicit-alias", verified: false };
  }

  if (targetNames.size === 0) {
    return { targetName: null, method: "no-target-roster-supplied", verified: false };
  }

  return { targetName: null, method: "unmapped", verified: false };
}

function visibleFieldEvidence(card, classNames, attributeNames = []) {
  for (const attrName of attributeNames) {
    const value = attribute(card, attrName);
    if (cleanText(value)) return { value: cleanText(value), locator: `a.kit[${attrName}]` };
  }
  const node = firstDescendant(card, (candidate) => hasAnyClass(candidate, classNames));
  if (!node) return null;
  const value = cleanText(textContent(node));
  return value ? { value, locator: `.${classTokens(node).values().next().value}` } : null;
}

function extractCardMetadata(card) {
  const supplier = visibleFieldEvidence(card, ["kit-supplier", "kit-brand"], ["data-supplier", "data-brand"]);
  const sponsor = visibleFieldEvidence(card, ["kit-sponsor"], ["data-sponsor"]);
  const release = visibleFieldEvidence(card, ["kit-release", "kit-released", "kit-release-date"], ["data-release-date", "data-released"]);
  const colours = visibleFieldEvidence(card, ["kit-colours", "kit-colors"], ["data-colours", "data-colors"]);
  const design = visibleFieldEvidence(card, ["kit-design", "kit-description"], ["data-design", "data-description"]);

  return {
    supplier: supplier?.value ?? null,
    supplierEvidence: supplier ? { locator: supplier.locator, value: supplier.value } : null,
    sponsor: sponsor?.value ?? null,
    sponsorEvidence: sponsor ? { locator: sponsor.locator, value: sponsor.value } : null,
    release: release?.value ?? null,
    releaseEvidence: release ? { locator: release.locator, value: release.value } : null,
    colourText: colours?.value ?? null,
    colourEvidence: colours ? { locator: colours.locator, value: colours.value } : null,
    designDescription: design?.value ?? null,
    designEvidence: design ? { locator: design.locator, value: design.value } : null,
  };
}

function fieldDiagnostics(metadata) {
  const missing = [];
  if (!metadata.release) missing.push("officialReleaseDate", "officialReleaseEvidence");
  if (!metadata.supplier) missing.push("supplier");
  if (!metadata.sponsor) missing.push("sponsor");
  if (!metadata.colourText) missing.push("colourNames", "hexColours");
  if (!metadata.designDescription) missing.push("designDescription");
  return missing;
}

function isUnderCatalogCollection(ancestors) {
  const inSeasonInventory = ancestors.some((ancestor) => hasAnyClass(ancestor, ["collection-kits", "kit-group", "archive-content-container"]));
  const inExcludedRegion = ancestors.some((ancestor) => hasAnyClass(ancestor, ["topflop-container", "topflop-section", "charts-container", "chart"]));
  return inSeasonInventory && !inExcludedRegion;
}

function teamArchiveIdentity(ancestors, sourceUrl) {
  const group = [...ancestors].reverse().find((ancestor) => hasClass(ancestor, "kit-container") || hasClass(ancestor, "kit-group"));
  if (!group) return { teamArchiveUrl: null, teamArchiveId: null };
  const archiveLink = descendants(group, (candidate) => {
    if (candidate.tagName !== "a" || hasClass(candidate, "kit")) return false;
    return /-kits-\d{4}(?:-\d{2})?-t\d+\/?$/i.test(attribute(candidate, "href") ?? "");
  })[0];
  const teamArchiveUrl = normalizeUrl(attribute(archiveLink, "href"), sourceUrl);
  const teamArchiveId = teamArchiveUrl?.match(/-t(\d+)\/?$/i)?.[1] ?? null;
  return { teamArchiveUrl, teamArchiveId };
}

function recordSort(left, right) {
  const typeRank = { home: 0, away: 1, third: 2 };
  const leftKey = [left.team.targetName ?? left.team.sourceName, left.kit.season, typeRank[left.kit.type] ?? 99, left.source.kitPageUrl];
  const rightKey = [right.team.targetName ?? right.team.sourceName, right.kit.season, typeRank[right.kit.type] ?? 99, right.source.kitPageUrl];
  return leftKey.join("\u0000").localeCompare(rightKey.join("\u0000"));
}

/**
 * Parse FKA league catalog HTML. A record represents only a visible season-card claim:
 * team name, season/type label, kit page identity, and thumbnail URL. It never turns
 * an image upload date, a page-level OG image, or league aggregate chart data into kit facts.
 */
export function parseFkaCatalog({
  html,
  sourceUrl,
  metadata = {},
  aliases = {},
  knownTeamNames = [],
  includeSecondary = false,
}) {
  const document = parse5.parse(html);
  const identity = sourceIdentity(document, sourceUrl, metadata);
  const diagnostics = [];
  const records = [];

  if (!sourceUrl) {
    diagnostics.push({ severity: "error", code: "missing-source-url", message: "Plain HTML requires --source-url; a Firecrawl metadata sourceURL also satisfies this." });
  }

  let host = null;
  try {
    host = new URL(sourceUrl).hostname.toLowerCase();
  } catch {
    // The missing or malformed URL diagnostic is emitted below.
  }
  if (host && !host.endsWith("footballkitarchive.com")) {
    diagnostics.push({ severity: "error", code: "unexpected-source-host", message: `Expected footballkitarchive.com, received ${host}.` });
  }
  if (!identity.expectedSeason) {
    diagnostics.push({ severity: "error", code: "unrecognized-catalog-season", message: "Could not prove a catalog season from the source URL or page title." });
  } else if (!new Set(["2026/27", "2026"]).has(identity.expectedSeason)) {
    diagnostics.push({ severity: "error", code: "outside-supported-season", message: `Catalog season ${identity.expectedSeason} is outside the allowed 2026/27 or MLS 2026 window.` });
  }

  const cards = [];
  walk(document, (node, ancestors) => {
    if (node.tagName !== "a" || !hasClass(node, "kit") || !attribute(node, "href")) return;
    if (!isUnderCatalogCollection(ancestors)) return;
    cards.push({ node, ancestors });
  });

  if (cards.length === 0) {
    diagnostics.push({ severity: "error", code: "no-seasonal-kit-cards", message: "No a.kit[href] cards were found below .collection-kits, .kit-group, or .archive-content-container." });
  }

  for (const { node: card, ancestors } of cards) {
    const sourceTeamName = firstTextForClasses(card, ["kit-teamname"]);
    const seasonLabel = firstTextForClasses(card, ["kit-season"]);
    const { season, rawType, type } = cardSeasonAndType(seasonLabel);
    const image = firstDescendant(card, (node) => node.tagName === "img");
    const kitPageUrl = normalizeUrl(attribute(card, "href"), sourceUrl);
    const { teamArchiveUrl, teamArchiveId } = teamArchiveIdentity(ancestors, sourceUrl);
    const imageSrc = normalizeUrl(attribute(image, "src"), sourceUrl);
    const imageDataSrc = normalizeUrl(attribute(image, "data-src"), sourceUrl);
    const imageUrl = imageDataSrc ?? imageSrc;

    const invalid = [];
    if (!sourceTeamName) invalid.push("missing team name (.kit-teamname)");
    if (!seasonLabel || !season) invalid.push("missing or invalid season label (.kit-season)");
    if (!type) invalid.push("missing kit type in .kit-season");
    if (!kitPageUrl) invalid.push("missing card href");
    if (!imageUrl) invalid.push("missing img src/data-src");
    if (season && identity.expectedSeason && season !== identity.expectedSeason) {
      invalid.push(`card season ${season} does not equal catalog season ${identity.expectedSeason}`);
    }
    if (invalid.length > 0) {
      diagnostics.push({ severity: "warning", code: "skipped-incomplete-card", message: invalid.join("; "), kitPageUrl: kitPageUrl ?? null });
      continue;
    }

    if (!includeSecondary && !PRIMARY_TYPES.has(type)) continue;

    const cardMetadata = extractCardMetadata(card);
    const missingFields = fieldDiagnostics(cardMetadata);
    const team = exactTeamResolution(sourceTeamName, aliases, knownTeamNames);
    const recordDiagnostics = [];

    if (!team.verified) {
      recordDiagnostics.push({
        severity: "warning",
        code: "unmapped-team-name",
        message: `No exact target-team name or validated explicit alias for ${sourceTeamName}.`,
      });
    }
    if (missingFields.length > 0) {
      recordDiagnostics.push({
        severity: "info",
        code: "fields-absent-from-catalog-card",
        fields: missingFields,
        message: "The league catalog card does not expose these fields. No values were inferred from the thumbnail, image upload path, page OG metadata, or league-wide chart.",
      });
    }

    records.push({
      recordKind: "fka-league-catalog-thumbnail",
      team: {
        sourceName: sourceTeamName,
        targetName: team.targetName,
        resolution: team.method,
      },
      kit: {
        season,
        type,
        sourceTypeLabel: rawType,
      },
      source: {
        ...identity,
        kitPageUrl,
        teamArchiveUrl,
        teamArchiveId,
        cardId: attribute(card, "id"),
        evidence: {
          teamName: { locator: ".kit-teamname", value: sourceTeamName },
          seasonAndType: { locator: ".kit-season", value: seasonLabel },
          image: {
            locator: "a.kit picture img",
            src: imageSrc,
            dataSrc: imageDataSrc,
            selectedUrl: imageUrl,
          },
        },
      },
      verifiedContent: {
        teamName: sourceTeamName,
        season,
        kitType: type,
        imageUrl,
        thumbnailOnly: true,
      },
      catalogCardMetadata: {
        supplier: cardMetadata.supplier,
        supplierEvidence: cardMetadata.supplierEvidence,
        sponsor: cardMetadata.sponsor,
        sponsorEvidence: cardMetadata.sponsorEvidence,
        release: cardMetadata.release,
        releaseEvidence: cardMetadata.releaseEvidence,
        colourText: cardMetadata.colourText,
        colourEvidence: cardMetadata.colourEvidence,
        designDescription: cardMetadata.designDescription,
        designEvidence: cardMetadata.designEvidence,
      },
      publication: {
        status: "source-catalog-listing-only",
        officiallyConfirmed: null,
        officialReleaseEvidence: null,
        note: "A league catalog card is a source-supported kit reference, not an official club release statement. It must not be presented as confirmation without separate release evidence.",
      },
      absentFields: ABSENT_CARD_FIELDS.filter((field) => missingFields.includes(field)),
      diagnostics: recordDiagnostics,
    });
  }

  const deduplicated = new Map();
  for (const record of records) {
    const key = record.source.kitPageUrl;
    if (!deduplicated.has(key)) deduplicated.set(key, record);
    else diagnostics.push({ severity: "info", code: "duplicate-catalog-card", message: "Dropped a duplicate kit-page URL from input.", kitPageUrl: key });
  }

  const outputRecords = [...deduplicated.values()].sort(recordSort);
  const teamCount = new Set(outputRecords.map((record) => record.team.sourceName)).size;

  diagnostics.unshift({
    severity: "info",
    code: "parser-scope",
    message: "Only a.kit[href] elements below .collection-kits, .kit-group, or .archive-content-container are parsed. Ranking/chart widgets and page-level OG images are excluded.",
  });

  return {
    parser: { id: "fka-league-catalog-v1", sourceName: SOURCE_NAME },
    source: identity,
    inputSha256: sha256(html),
    records: outputRecords,
    diagnostics,
    summary: {
      catalogCardsFound: cards.length,
      recordsEmitted: outputRecords.length,
      sourceTeamsEmitted: teamCount,
      primaryTypesOnly: !includeSecondary,
      fieldsNotAvailableOnAnyLeagueCard: [...new Set(outputRecords.flatMap((record) => record.absentFields))].sort(),
    },
  };
}

export function mergeCatalogResults(results) {
  const diagnostics = [];
  const sources = [];
  const recordMap = new Map();

  for (const result of results) {
    sources.push({ source: result.source, inputSha256: result.inputSha256, summary: result.summary });
    diagnostics.push(...result.diagnostics);
    for (const record of result.records) {
      const existing = recordMap.get(record.source.kitPageUrl);
      if (!existing) recordMap.set(record.source.kitPageUrl, record);
      else if (JSON.stringify(existing) !== JSON.stringify(record)) {
        diagnostics.push({ severity: "warning", code: "conflicting-duplicate-kit-page", message: "A kit page appeared in more than one input with non-identical card data.", kitPageUrl: record.source.kitPageUrl });
      }
    }
  }

  const records = [...recordMap.values()].sort(recordSort);
  return {
    schemaVersion: "1.0.0",
    generatedBy: "scripts/kit-import.mjs",
    deterministic: true,
    policy: {
      permittedSeasons: ["2026/27", "2026 (MLS)"],
      selection: "a.kit[href] under .collection-kits, .kit-group, or .archive-content-container; ranking/chart regions excluded; default home, away, and third only",
      teamResolution: "exact names or explicit aliases only; no fuzzy matching",
      confirmation: "catalog thumbnails are source-supported visual references but not official release confirmation",
    },
    sources,
    records,
    diagnostics,
    summary: {
      sourceDocuments: results.length,
      records: records.length,
      sourceTeams: new Set(records.map((record) => record.team.sourceName)).size,
      mappedTeams: new Set(records.map((record) => record.team.targetName).filter(Boolean)).size,
      unconfirmedCatalogListings: records.filter((record) => record.publication.officiallyConfirmed !== true).length,
      diagnosticsBySeverity: Object.fromEntries(["error", "warning", "info"].map((severity) => [severity, diagnostics.filter((item) => item.severity === severity).length])),
    },
  };
}
