import { parse } from "smol-toml";

import type {
  DocsBuilder,
  DocsSource,
  Project,
  ProjectSite,
  ProjectStatus,
} from "./types.ts";

const PROJECT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SITE_URL = /^https:\/\/[a-z0-9.-]+\/$/;
const HOSTNAME = /^[a-z0-9.-]+$/;

const RESERVED_IDS = new Set([
  "assets",
  "blog",
  "docs",
  "lab",
  "pagefind",
  "search",
  "slides",
  "www",
]);

const RESERVED_HOSTS = new Set([
  "blog.zrr.dev",
  "docs.zrr.dev",
  "lab.zrr.dev",
  "slides.zrr.dev",
  "www.zrr.dev",
  "zrr.dev",
]);

const PROJECT_FIELDS = [
  "name",
  "repository",
  "summary",
  "status",
  "site",
  "docs",
];
const SITE_FIELDS = ["kind", "url", "repository"];
const DOCS_FIELDS = ["ref", "builder", "config", "legacy_hosts"];

export class CatalogError extends Error {
  readonly file: string;

  constructor(file: string, message: string) {
    super(`${file}: ${message}`);
    this.name = "CatalogError";
    this.file = file;
  }
}

export function parseProject(filename: string, source: string): Project {
  const id = projectId(filename);
  const file = `${id}.toml`;
  const record = parseTable(file, source);
  assertKeys(file, "project", record, PROJECT_FIELDS);

  const site = parseSite(file, id, record.site);
  const docs = parseDocs(file, id, site, record.docs);

  return {
    id,
    name: requireLine(file, "name", record.name),
    repository: parseRepository(file, "repository", record.repository),
    summary: requireLine(file, "summary", record.summary),
    status: parseStatus(file, record.status),
    site,
    ...(docs ? { docs } : {}),
  };
}

export function validateCatalog(projects: readonly Project[]): void {
  const ids = new Set<string>();
  for (const project of projects) {
    if (ids.has(project.id)) {
      throw new CatalogError(`${project.id}.toml`, "duplicate project id");
    }
    ids.add(project.id);
  }

  const hosts = new Map<string, string>();
  const urls = new Map<string, string>();
  for (const project of projects) {
    const file = `${project.id}.toml`;
    if (project.site.kind === "external") {
      claim(urls, project.site.url, project.id, file, "site.url");
      claim(
        hosts,
        new URL(project.site.url).hostname,
        project.id,
        file,
        "site host"
      );
    }
    for (const host of project.docs?.legacyHosts ?? []) {
      const ownerId = host.slice(0, -".zrr.dev".length);
      if (ownerId !== project.id && ids.has(ownerId)) {
        throw new CatalogError(file, `${host} belongs to project ${ownerId}`);
      }
      claim(hosts, host, project.id, file, "legacy host");
    }
  }
}

function claim(
  seen: Map<string, string>,
  key: string,
  id: string,
  file: string,
  label: string
): void {
  const owner = seen.get(key);
  if (owner) {
    throw new CatalogError(file, `${label} ${key} is already used by ${owner}`);
  }
  seen.set(key, id);
}

function projectId(filename: string): string {
  const base = filename.split("/").at(-1) ?? filename;
  if (!base.endsWith(".toml")) {
    throw new CatalogError(filename, "project file must end in .toml");
  }
  const id = base.slice(0, -".toml".length);
  if (!PROJECT_ID.test(id) || RESERVED_IDS.has(id)) {
    throw new CatalogError(filename, `invalid project id ${id}`);
  }
  return id;
}

function parseTable(file: string, source: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = parse(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid TOML";
    throw new CatalogError(file, message);
  }
  if (!isRecord(parsed)) {
    throw new CatalogError(file, "project file must be a table");
  }
  return parsed;
}

function parseSite(file: string, id: string, value: unknown): ProjectSite {
  if (!isRecord(value)) throw new CatalogError(file, "site must be a table");
  assertKeys(file, "site", value, SITE_FIELDS);
  const kind = parseSiteKind(file, value.kind);
  switch (kind) {
    case "lab":
      if (value.url !== undefined || value.repository !== undefined) {
        throw new CatalogError(
          file,
          "a lab site has no url or website repository"
        );
      }
      return { kind: "lab" };
    case "external":
      return {
        kind: "external",
        url: parseSiteUrl(file, id, value.url),
        ...(value.repository === undefined
          ? {}
          : {
              repository: parseRepository(
                file,
                "site.repository",
                value.repository
              ),
            }),
      };
    default: {
      const exhaustive: never = kind;
      throw new CatalogError(file, exhaustive);
    }
  }
}

function parseDocs(
  file: string,
  id: string,
  site: ProjectSite,
  value: unknown
): DocsSource | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new CatalogError(file, "docs must be a table");
  assertKeys(file, "docs", value, DOCS_FIELDS);
  const legacyHosts = parseLegacyHosts(file, id, site, value.legacy_hosts);
  return {
    ref: parseRef(file, value.ref),
    builder: parseBuilder(file, value.builder),
    config: parseConfigPath(file, value.config),
    legacyHosts,
  };
}

function parseLegacyHosts(
  file: string,
  id: string,
  site: ProjectSite,
  value: unknown
): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new CatalogError(file, "docs.legacy_hosts must be an array");
  }
  const hosts = value.map(host => parseLegacyHost(file, id, site, host));
  if (new Set(hosts).size !== hosts.length) {
    throw new CatalogError(file, "docs.legacy_hosts contains a duplicate");
  }
  return hosts;
}

function parseLegacyHost(
  file: string,
  id: string,
  site: ProjectSite,
  value: unknown
): string {
  if (
    typeof value !== "string" ||
    !HOSTNAME.test(value) ||
    value.includes("..")
  ) {
    throw new CatalogError(
      file,
      "docs.legacy_hosts entries must be lowercase hostnames"
    );
  }
  if (!value.endsWith(".zrr.dev") || RESERVED_HOSTS.has(value)) {
    throw new CatalogError(file, `${value} is not a movable zrr.dev docs host`);
  }
  if (site.kind === "external") {
    const siteHost = new URL(site.url).hostname;
    if (value === siteHost) {
      throw new CatalogError(file, `${value} is the canonical site host`);
    }
    if (siteHost !== `${id}.zrr.dev` && value === `${id}.zrr.dev`) {
      throw new CatalogError(
        file,
        `${value} is reserved for the product hostname redirect`
      );
    }
  }
  return value;
}

function parseSiteUrl(file: string, id: string, value: unknown): string {
  const text = requireLine(file, "site.url", value);
  if (!SITE_URL.test(text) || text.includes("..")) {
    throw new CatalogError(file, "site.url must be https://host/");
  }
  const host = new URL(text).hostname;
  if (RESERVED_HOSTS.has(host)) {
    throw new CatalogError(file, `${host} is a reserved hostname`);
  }
  if (host === "zrr.dev" || host.endsWith(".zrr.dev")) {
    const productHost = `${id}.zrr.dev`;
    if (host !== productHost) {
      throw new CatalogError(
        file,
        `site.url on zrr.dev must use ${productHost}`
      );
    }
  }
  return text;
}

function parseConfigPath(file: string, value: unknown): string {
  const text = requireLine(file, "docs.config", value);
  const parts = text.split("/");
  if (parts.some(part => part === "" || part === "." || part === "..")) {
    throw new CatalogError(file, "docs.config must stay inside the repository");
  }
  return text;
}

function parseRef(file: string, value: unknown): string {
  const text = requireLine(file, "docs.ref", value);
  if (text.includes("://") || text.includes("\\")) {
    throw new CatalogError(file, "docs.ref must be a branch, tag, or commit");
  }
  return text;
}

function parseRepository(file: string, label: string, value: unknown): string {
  const text = requireLine(file, label, value);
  const [owner, name, extra] = text.split("/");
  if (
    extra !== undefined ||
    !owner ||
    !name ||
    !REPOSITORY.test(text) ||
    owner.startsWith(".") ||
    name.startsWith(".")
  ) {
    throw new CatalogError(file, `${label} must be owner/name`);
  }
  return text;
}

function parseStatus(file: string, value: unknown): ProjectStatus {
  const text = requireLine(file, "status", value);
  switch (text) {
    case "active":
    case "archived":
      return text;
    default:
      throw new CatalogError(file, 'status must be "active" or "archived"');
  }
}

function parseSiteKind(file: string, value: unknown): ProjectSite["kind"] {
  const text = requireLine(file, "site.kind", value);
  switch (text) {
    case "lab":
    case "external":
      return text;
    default:
      throw new CatalogError(file, 'site.kind must be "lab" or "external"');
  }
}

function parseBuilder(file: string, value: unknown): DocsBuilder {
  const text = requireLine(file, "docs.builder", value);
  switch (text) {
    case "zensical":
      return text;
    default:
      throw new CatalogError(file, "docs.builder must be zensical");
  }
}

function requireLine(file: string, label: string, value: unknown): string {
  if (typeof value !== "string" || value === "" || value !== value.trim()) {
    throw new CatalogError(
      file,
      `${label} must be a non-empty single-line string`
    );
  }
  if (value.includes("\n") || value.includes("\r")) {
    throw new CatalogError(
      file,
      `${label} must be a non-empty single-line string`
    );
  }
  return value;
}

function assertKeys(
  file: string,
  label: string,
  value: Record<string, unknown>,
  allowed: readonly string[]
): void {
  const unknown = Object.keys(value).filter(key => !allowed.includes(key));
  if (unknown.length > 0) {
    throw new CatalogError(
      file,
      `${label} has unknown fields: ${unknown.join(", ")}`
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
