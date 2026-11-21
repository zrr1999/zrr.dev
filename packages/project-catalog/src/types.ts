/** Stable project id. It is the TOML filename and the public path segment. */
export type ProjectId = string;

export type ProjectStatus = "active" | "archived";

/** First-party docs builder. New builders are added here before a project may use them. */
export type DocsBuilder = "zensical";

/**
 * Lab renders the project introduction.
 * External projects keep a catalog card and send the introduction URL to `url`.
 */
export type ProjectSite =
  | { kind: "lab" }
  | {
      kind: "external";
      /** Canonical website origin, including the trailing slash. */
      url: string;
      /** Website repository when it is separate from the code repository. */
      repository?: string;
    };

export interface DocsSource {
  /** Branch, tag, or commit the central build tracks. A publish resolves it to a SHA. */
  ref: string;
  builder: DocsBuilder;
  /** Path of the docs config inside the project repository. */
  config: string;
  /**
   * Previous docs hostnames under `zrr.dev`.
   * Redirects are deployed only after `docs.zrr.dev/<id>/` serves the same pages.
   */
  legacyHosts: readonly string[];
}

export interface Project {
  id: ProjectId;
  name: string;
  /** Code repository, `owner/name`. Docs manuscripts live here. */
  repository: string;
  summary: string;
  status: ProjectStatus;
  site: ProjectSite;
  docs?: DocsSource;
}

export interface RedirectRule {
  fromHost: string;
  /** `/` matches the whole host. Any other path matches that path and its children. */
  fromPath: string;
  /** Destination origin plus base path, without a trailing slash. */
  toPrefix: string;
  preservePath: boolean;
  preserveQuery: boolean;
  status: 308;
}
