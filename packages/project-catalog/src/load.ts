import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseProject, validateCatalog } from "./schema.ts";
import type { Project } from "./types.ts";

const defaultProjectsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../projects"
);

export function loadCatalog(projectsDir = defaultProjectsDir): Project[] {
  const projects = readdirSync(projectsDir)
    .filter(name => name.endsWith(".toml"))
    .sort()
    .map(name =>
      parseProject(name, readFileSync(join(projectsDir, name), "utf8"))
    );
  validateCatalog(projects);
  return projects;
}
