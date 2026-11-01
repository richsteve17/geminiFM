#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  FKA_2026_CATALOG_SOURCES,
  mergeCatalogResults,
  parseFkaCatalog,
  readSourceFile,
} from "./kit_sources/fka.mjs";

function usage() {
  return `Usage:
  node scripts/kit-import.mjs --input <catalog.html|firecrawl.json> [--input <...>]
    [--source-url <url>] [--aliases <alias-map.json>] [--out <catalog.json>]
    [--coverage-out <coverage.json>] [--include-secondary] [--strict]

Optional deterministic retrieval (no browser or LLM):
  node scripts/kit-import.mjs --fetch all --fetch-dir /tmp/fka-html --out <catalog.json>
  node scripts/kit-import.mjs --fetch <FKA catalog URL> --fetch-dir /tmp/fka-html --out <catalog.json>

Rules:
  * Input may be plain HTML or a Firecrawl JSON envelope containing html / structuredContent.
  * Firecrawl inputs with metadata.statusCode other than 200 are skipped.
  * Plain HTML needs --source-url unless the source URL is embedded in its input envelope.
  * Only 2026/27 catalog cards and MLS 2026 catalog cards are eligible.
  * Default output is Home, Away, and Third cards. --include-secondary adds fourth/GK/etc.
  * Team resolution is exact string matching or an explicit aliases entry; no fuzzy matching.
`;
}

function parseArgs(argv) {
  const options = {
    inputs: [],
    sourceUrls: [],
    fetchUrls: [],
    aliasesPath: new URL("./kit_sources/manusfm-team-aliases.json", import.meta.url),
    outputPath: null,
    coveragePath: null,
    fetchDir: null,
    includeSecondary: false,
    strict: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${token} requires a value`);
      index += 1;
      return value;
    };

    switch (token) {
      case "--input": options.inputs.push(next()); break;
      case "--source-url": options.sourceUrls.push(next()); break;
      case "--aliases": options.aliasesPath = next(); break;
      case "--out":
      case "--output": options.outputPath = next(); break;
      case "--coverage-out": options.coveragePath = next(); break;
      case "--fetch": options.fetchUrls.push(next()); break;
      case "--fetch-dir": options.fetchDir = next(); break;
      case "--include-secondary": options.includeSecondary = true; break;
      case "--strict": options.strict = true; break;
      case "--help":
      case "-h": options.help = true; break;
      default: throw new Error(`Unknown option: ${token}`);
    }
  }

  return options;
}

async function readAliasConfiguration(fileOrUrl) {
  const filePath = fileOrUrl instanceof URL ? fileOrUrl : path.resolve(fileOrUrl);
  const raw = JSON.parse(await readFile(filePath, "utf8"));
  const aliases = raw.aliases ?? raw;
  const knownTeamNames = raw.targetTeamNames ?? [];

  if (!aliases || typeof aliases !== "object" || Array.isArray(aliases)) {
    throw new Error(`${filePath}: aliases must be an object or an object with an aliases key`);
  }
  if (!Array.isArray(knownTeamNames)) {
    throw new Error(`${filePath}: targetTeamNames must be an array when provided`);
  }
  for (const [sourceName, targetName] of Object.entries(aliases)) {
    if (typeof targetName !== "string" || !targetName) {
      throw new Error(`${filePath}: alias ${sourceName} must map to a non-empty string`);
    }
    if (knownTeamNames.length > 0 && !knownTeamNames.includes(targetName)) {
      throw new Error(`${filePath}: alias ${sourceName} targets ${targetName}, which is absent from targetTeamNames`);
    }
  }
  return { aliases, knownTeamNames, aliasPath: String(filePath) };
}

function fetchTargets(values) {
  const targets = [];
  for (const value of values) {
    if (value === "all") targets.push(...FKA_2026_CATALOG_SOURCES.map((source) => source.url));
    else targets.push(value);
  }
  return [...new Set(targets)];
}

function stableFetchFilename(url) {
  const parsed = new URL(url);
  const base = parsed.pathname.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "") || "fka-catalog";
  return `${base}.html`;
}

async function retrieve(url, directory) {
  const response = await fetch(url, {
    headers: { "user-agent": "manusfm-kit-import/1.0 (deterministic source acquisition)" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const html = await response.text();
  if (!/<(?:html|body|a)\b/i.test(html)) throw new Error(`${url}: response did not contain HTML`);
  await mkdir(directory, { recursive: true });
  const filePath = path.join(directory, stableFetchFilename(url));
  await writeFile(filePath, html);
  return { filePath, sourceUrl: url };
}

function sourceUrlOverrideForInput(options, inputIndex) {
  if (options.sourceUrls.length === 0) return null;
  if (options.sourceUrls.length === 1) return options.sourceUrls[0];
  if (options.sourceUrls.length === options.inputs.length) return options.sourceUrls[inputIndex];
  throw new Error("Use zero, one, or exactly one --source-url per --input file.");
}

function statusCode(metadata) {
  const value = metadata?.statusCode;
  return value === undefined || value === null || value === "" ? null : Number(value);
}

function printSummary(catalog, outputPath) {
  const summary = {
    output: outputPath ?? "stdout",
    sources: catalog.summary.sourceDocuments,
    records: catalog.summary.records,
    sourceTeams: catalog.summary.sourceTeams,
    mappedTeams: catalog.summary.mappedTeams,
    unconfirmedCatalogListings: catalog.summary.unconfirmedCatalogListings,
    diagnostics: catalog.summary.diagnosticsBySeverity,
  };
  process.stderr.write(`${JSON.stringify(summary)}\n`);
}

function coverageDiagnostics(catalog, knownTeamNames) {
  const recordsByCatalog = new Map();
  for (const record of catalog.records) {
    const key = record.source.catalogUrl ?? "unknown-source";
    if (!recordsByCatalog.has(key)) recordsByCatalog.set(key, []);
    recordsByCatalog.get(key).push(record);
  }

  const catalogSources = catalog.sources.map(({ source, inputSha256, summary }) => {
    const records = recordsByCatalog.get(source.catalogUrl ?? "unknown-source") ?? [];
    const sourceTeams = [...new Set(records.map((record) => record.team.sourceName))].sort();
    const mappedTargetTeams = [...new Set(records.map((record) => record.team.targetName).filter(Boolean))].sort();
    const unmappedSourceTeams = [...new Set(records.filter((record) => !record.team.targetName).map((record) => record.team.sourceName))].sort();
    return {
      source,
      inputSha256,
      parserSummary: summary,
      emittedRecords: records.length,
      sourceTeams,
      mappedTargetTeams,
      unmappedSourceTeams,
      recordsByKitType: Object.fromEntries(["home", "away", "third"].map((type) => [type, records.filter((record) => record.kit.type === type).length])),
    };
  });

  const mapped = new Set(catalog.records.map((record) => record.team.targetName).filter(Boolean));
  const targetTeamNames = [...knownTeamNames].sort();
  const kitPageUrls = catalog.records.map((record) => record.source.kitPageUrl);
  return {
    schemaVersion: "1.0.0",
    generatedBy: "scripts/kit-import.mjs",
    deterministic: true,
    recordScope: "source-supported league-catalog thumbnails; not official release confirmation",
    rosterCoverage: {
      targetTeams: targetTeamNames.length,
      targetTeamsWithCandidates: [...mapped].sort(),
      targetTeamsWithoutCandidates: targetTeamNames.filter((teamName) => !mapped.has(teamName)),
      mappedTargetTeamCount: mapped.size,
    },
    catalogSources,
    integrity: {
      emittedRecords: catalog.records.length,
      uniqueKitPageUrls: new Set(kitPageUrls).size,
      duplicateKitPageUrls: kitPageUrls.length - new Set(kitPageUrls).size,
      allRecordsAreAllowedSeasons: catalog.records.every((record) => record.kit.season === "2026/27" || record.kit.season === "2026"),
      allRecordsArePrimaryTypes: catalog.records.every((record) => ["home", "away", "third"].includes(record.kit.type)),
      officiallyConfirmedRecords: catalog.records.filter((record) => record.publication.officiallyConfirmed === true).length,
      thumbnailOnlyRecords: catalog.records.filter((record) => record.verifiedContent.thumbnailOnly).length,
    },
    unavailableOnLeagueCards: [...new Set(catalog.records.flatMap((record) => record.absentFields))].sort(),
    skippedInputs: catalog.diagnostics.filter((diagnostic) => diagnostic.code === "skipped-non-200-source" || diagnostic.code === "skipped-invalid-source"),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  if (options.fetchUrls.length > 0) {
    const directory = options.fetchDir ? path.resolve(options.fetchDir) : path.resolve("/tmp/manus-kit-import/fetched-html");
    for (const url of fetchTargets(options.fetchUrls)) {
      const fetched = await retrieve(url, directory);
      options.inputs.push(fetched.filePath);
      options.sourceUrls.push(fetched.sourceUrl);
    }
  }

  if (options.inputs.length === 0) throw new Error("Provide at least one --input or --fetch target.\n\n" + usage());
  if (!options.outputPath) throw new Error("Provide --out <catalog.json>; this importer does not overwrite runtime data.");

  const { aliases, knownTeamNames, aliasPath } = await readAliasConfiguration(options.aliasesPath);
  const results = [];
  const skipped = [];

  for (let inputIndex = 0; inputIndex < options.inputs.length; inputIndex += 1) {
    const inputPath = path.resolve(options.inputs[inputIndex]);
    const sourceUrlOverride = sourceUrlOverrideForInput(options, inputIndex);
    const documents = await readSourceFile(inputPath);

    for (const document of documents) {
      const status = statusCode(document.metadata);
      const sourceUrl = sourceUrlOverride ?? document.metadata.sourceURL ?? document.metadata.sourceUrl ?? document.metadata.url ?? null;
      if (status !== null && status !== 200) {
        skipped.push({
          severity: "warning",
          code: "skipped-non-200-source",
          inputPath,
          sourceUrl,
          statusCode: status,
          message: "Source payload metadata did not report HTTP 200; no cards were parsed.",
        });
        continue;
      }

      const result = parseFkaCatalog({
        html: document.html,
        sourceUrl,
        metadata: document.metadata,
        aliases,
        knownTeamNames,
        includeSecondary: options.includeSecondary,
      });

      const sourceErrors = result.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
      if (sourceErrors.length > 0) {
        skipped.push({
          severity: "warning",
          code: "skipped-invalid-source",
          inputPath,
          sourceUrl,
          errors: sourceErrors,
          message: "No records emitted from an input with source-validation errors.",
        });
        continue;
      }
      results.push(result);
    }
  }

  const catalog = mergeCatalogResults(results);
  catalog.aliasConfiguration = {
    path: aliasPath,
    targetTeamNames: knownTeamNames.length,
    explicitAliases: Object.keys(aliases).length,
  };
  catalog.diagnostics.push(...skipped);
  catalog.summary.diagnosticsBySeverity = Object.fromEntries(
    ["error", "warning", "info"].map((severity) => [severity, catalog.diagnostics.filter((item) => item.severity === severity).length]),
  );
  catalog.summary.skippedInputs = skipped.length;

  const outputPath = path.resolve(options.outputPath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
  if (options.coveragePath) {
    const coveragePath = path.resolve(options.coveragePath);
    await mkdir(path.dirname(coveragePath), { recursive: true });
    await writeFile(coveragePath, `${JSON.stringify(coverageDiagnostics(catalog, knownTeamNames), null, 2)}\n`);
  }
  printSummary(catalog, outputPath);

  if (options.strict && (catalog.summary.diagnosticsBySeverity.error > 0 || skipped.length > 0)) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  process.stderr.write(`kit-import: ${error.message}\n`);
  process.exitCode = 1;
});
