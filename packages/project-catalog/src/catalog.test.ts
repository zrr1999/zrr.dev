/// <reference types="vite-plus/test/globals" />

import {
  centralRedirects,
  docsUrl,
  labUrl,
  productDocsTarget,
  resolveRedirect,
  siteUrl,
  websiteRepository,
} from "./links.ts";
import { loadCatalog } from "./load.ts";
import { CatalogError, parseProject, validateCatalog } from "./schema.ts";
import type { Project } from "./types.ts";

const example = `
name = "Example"
repository = "example/example"
summary = "Example project"
status = "active"

[site]
kind = "external"
url = "https://product.example/"

[docs]
ref = "v1.2.0"
builder = "zensical"
config = "zensical.toml"
`;

describe("project catalog", () => {
  const projects = loadCatalog();
  const byId = new Map(projects.map(project => [project.id, project]));

  it("loads the registered projects in order", () => {
    expect(projects.map(project => project.id)).toEqual([
      "cue",
      "rill",
      "spark",
      "spore",
      "zendev",
    ]);
  });

  it("derives lab and docs addresses from the project id", () => {
    const cue = project(byId, "cue");
    const zendev = project(byId, "zendev");

    expect(siteUrl(cue)).toBe(labUrl("cue"));
    expect(docsUrl(cue)).toBeUndefined();
    expect(websiteRepository(cue)).toBeUndefined();
    expect(docsUrl(zendev)).toBe("https://docs.zrr.dev/zendev/");
    expect(zendev.docs?.legacyHosts).toEqual(["docs.zendev.zrr.dev"]);
  });

  it("keeps an external website on its own repository", () => {
    const spore = project(byId, "spore");

    expect(siteUrl(spore)).toBe("https://spore-lang.dev/");
    expect(websiteRepository(spore)).toBe("spore-lang/spore-lang.dev");
    expect(docsUrl(spore)).toBeUndefined();
  });

  it("sends lab and old product hosts to the current site", () => {
    const rules = centralRedirects(projects);

    expect(resolveRedirect(rules, "https://lab.zrr.dev/spore")).toBe(
      "https://spore-lang.dev/"
    );
    expect(resolveRedirect(rules, "https://lab.zrr.dev/spore/old?x=1")).toBe(
      "https://spore-lang.dev/"
    );
    expect(resolveRedirect(rules, "https://spore.zrr.dev/features/?q=1")).toBe(
      "https://spore-lang.dev/features/?q=1"
    );
    expect(
      resolveRedirect(rules, "https://lab.zrr.dev/zendev/")
    ).toBeUndefined();
    expect(resolveRedirect(rules, "https://zendev.zrr.dev/")).toBeUndefined();
  });

  it("moves legacy docs hosts onto the central project path", () => {
    const rules = centralRedirects(projects);

    expect(
      resolveRedirect(rules, "https://docs.zendev.zrr.dev/guides/commits/?q=1")
    ).toBe("https://docs.zrr.dev/zendev/guides/commits/?q=1");
    expect(resolveRedirect(rules, "https://rill.zrr.dev/")).toBe(
      "https://docs.zrr.dev/rill/"
    );
    expect(
      resolveRedirect(rules, "https://docs.zrr.dev/zendev/")
    ).toBeUndefined();
  });

  it("does not chain zrr.dev redirects", () => {
    const rules = centralRedirects(projects);
    const samples = rules.flatMap(rule => {
      const origin = `https://${rule.fromHost}`;
      if (rule.fromPath === "/") {
        return [`${origin}/`, `${origin}/features/`, `${origin}/features/?q=1`];
      }
      return [
        `${origin}${rule.fromPath}`,
        `${origin}${rule.fromPath}/`,
        `${origin}${rule.fromPath}/extra/?q=1`,
      ];
    });

    for (const sample of samples) {
      const once = resolveRedirect(rules, sample);
      expect(once, sample).toMatch(/^https:\/\//);
      expect(resolveRedirect(rules, once ?? sample), sample).toBeUndefined();
    }
  });
});

describe("product docs entry", () => {
  const project = parseProject("example.toml", example);

  it("keeps the section path on the central docs host", () => {
    expect(productDocsTarget(project, "/docs")).toBe(
      "https://docs.zrr.dev/example/"
    );
    expect(productDocsTarget(project, "/docs/")).toBe(
      "https://docs.zrr.dev/example/"
    );
    expect(productDocsTarget(project, "/docs/reference/cli/", "?q=1")).toBe(
      "https://docs.zrr.dev/example/reference/cli/?q=1"
    );
    expect(productDocsTarget(project, "/docs-extra")).toBeUndefined();
  });

  it("sends the old product hostname directly to docs or the final site", () => {
    const rules = centralRedirects([project]);

    expect(resolveRedirect(rules, "https://example.zrr.dev/features/")).toBe(
      "https://product.example/features/"
    );
    expect(
      resolveRedirect(rules, "https://example.zrr.dev/docs/reference/cli/?q=1")
    ).toBe("https://docs.zrr.dev/example/reference/cli/?q=1");
    expect(
      resolveRedirect(rules, "https://product.example/docs/")
    ).toBeUndefined();
  });
});

describe("catalog validation", () => {
  it("rejects contradictory site records", () => {
    expect(() =>
      parseProject(
        "pagefind.toml",
        `
name = "Pagefind"
repository = "example/example"
summary = "Reserved path"
status = "active"

[site]
kind = "lab"
`
      )
    ).toThrow(CatalogError);

    expect(() =>
      parseProject(
        "example.toml",
        `
name = "Example"
repository = "example/example"
summary = "Example"
status = "active"

[site]
kind = "lab"
url = "https://example.zrr.dev/"
`
      )
    ).toThrow(CatalogError);

    expect(() =>
      parseProject(
        "example.toml",
        `
name = "Example"
repository = "example/example"
summary = "Example"
status = "active"

[site]
kind = "external"
url = "https://blog.zrr.dev/"
`
      )
    ).toThrow(CatalogError);
  });

  it("rejects a legacy host that would share the product hostname", () => {
    expect(() =>
      parseProject(
        "example.toml",
        `
name = "Example"
repository = "example/example"
summary = "Example"
status = "active"

[site]
kind = "external"
url = "https://product.example/"

[docs]
ref = "main"
builder = "zensical"
config = "zensical.toml"
legacy_hosts = ["example.zrr.dev"]
`
      )
    ).toThrow(CatalogError);
  });

  it("rejects overlapping hosts across projects", () => {
    const cue = parseProject(
      "cue.toml",
      `
name = "Cue"
repository = "zendev-lab/cue"
summary = "Cue"
status = "active"

[site]
kind = "lab"
`
    );
    const other = parseProject(
      "other.toml",
      `
name = "Other"
repository = "example/other"
summary = "Other"
status = "active"

[site]
kind = "lab"

[docs]
ref = "main"
builder = "zensical"
config = "zensical.toml"
legacy_hosts = ["cue.zrr.dev"]
`
    );

    expect(() => validateCatalog([cue, other])).toThrow(CatalogError);
  });
});

function project(projects: ReadonlyMap<string, Project>, id: string): Project {
  const found = projects.get(id);
  if (!found) throw new Error(`missing ${id}`);
  return found;
}
