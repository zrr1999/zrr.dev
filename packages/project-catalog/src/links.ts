import type { Project, RedirectRule } from "./types.ts";

export const LAB_HOST = "lab.zrr.dev";
export const DOCS_HOST = "docs.zrr.dev";

export function labUrl(id: string): string {
  return `https://${LAB_HOST}/${id}/`;
}

export function repositoryUrl(repository: string): string {
  return `https://github.com/${repository}`;
}

export function siteUrl(project: Project): string {
  switch (project.site.kind) {
    case "lab":
      return labUrl(project.id);
    case "external":
      return project.site.url;
    default: {
      const exhaustive: never = project.site;
      return exhaustive;
    }
  }
}

export function docsUrl(project: Project): string | undefined {
  if (!project.docs) return undefined;
  return `https://${DOCS_HOST}/${project.id}/`;
}

/** Repository that builds the product website. Lab introductions stay in this repo. */
export function websiteRepository(project: Project): string | undefined {
  switch (project.site.kind) {
    case "lab":
      return undefined;
    case "external":
      return project.site.repository ?? project.repository;
    default: {
      const exhaustive: never = project.site;
      return exhaustive;
    }
  }
}

/**
 * Redirects owned by the zrr.dev zone.
 * Product hosts implement `/docs` themselves while they are the canonical site.
 */
export function centralRedirects(projects: readonly Project[]): RedirectRule[] {
  const rules: RedirectRule[] = [];
  for (const project of [...projects].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    if (project.site.kind === "external") {
      rules.push({
        fromHost: LAB_HOST,
        fromPath: `/${project.id}`,
        toPrefix: originOf(project.site.url),
        preservePath: false,
        preserveQuery: false,
        status: 308,
      });
      const productHost = `${project.id}.zrr.dev`;
      const siteHost = new URL(project.site.url).hostname;
      if (siteHost !== productHost) {
        rules.push({
          fromHost: productHost,
          fromPath: "/",
          toPrefix: originOf(project.site.url),
          preservePath: true,
          preserveQuery: true,
          status: 308,
        });
        if (project.docs) {
          rules.push({
            fromHost: productHost,
            fromPath: "/docs",
            toPrefix: docsPrefix(project.id),
            preservePath: true,
            preserveQuery: true,
            status: 308,
          });
        }
      }
    }
    for (const host of project.docs?.legacyHosts ?? []) {
      rules.push({
        fromHost: host,
        fromPath: "/",
        toPrefix: docsPrefix(project.id),
        preservePath: true,
        preserveQuery: true,
        status: 308,
      });
    }
  }
  return rules;
}

/** Where a product website sends its own `/docs` entry. */
export function productDocsTarget(
  project: Project,
  pathname: string,
  search = ""
): string | undefined {
  if (project.site.kind !== "external" || !project.docs) return undefined;
  if (!matchesPath(pathname, "/docs")) return undefined;
  return destination(docsPrefix(project.id), "/docs", true, pathname, search);
}

export function resolveRedirect(
  rules: readonly RedirectRule[],
  requestUrl: string
): string | undefined {
  const url = new URL(requestUrl);
  const matches = rules.filter(
    rule =>
      rule.fromHost === url.hostname && matchesPath(url.pathname, rule.fromPath)
  );
  const rule = matches.reduce<RedirectRule | undefined>((best, candidate) => {
    if (!best || candidate.fromPath.length > best.fromPath.length)
      return candidate;
    return best;
  }, undefined);
  if (!rule) return undefined;
  return destination(
    rule.toPrefix,
    rule.fromPath,
    rule.preservePath,
    url.pathname,
    rule.preserveQuery ? url.search : ""
  );
}

function docsPrefix(id: string): string {
  return `https://${DOCS_HOST}/${id}`;
}

function originOf(siteUrl: string): string {
  const url = new URL(siteUrl);
  return `${url.protocol}//${url.host}`;
}

function matchesPath(pathname: string, fromPath: string): boolean {
  if (fromPath === "/") return true;
  return pathname === fromPath || pathname.startsWith(`${fromPath}/`);
}

function destination(
  toPrefix: string,
  fromPath: string,
  preservePath: boolean,
  pathname: string,
  search: string
): string {
  if (!preservePath) return `${toPrefix}/${search}`;
  const remainder =
    fromPath === "/" ? pathname : pathname.slice(fromPath.length);
  if (remainder === "" || remainder === "/") return `${toPrefix}/${search}`;
  return `${toPrefix}${remainder}${search}`;
}
