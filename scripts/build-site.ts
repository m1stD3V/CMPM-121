// Builds the hub page in dist/ and gathers each project's production build.
//
//   deno task site                     build from each project's local dist/
//   deno task site --staging=staging   use artifacts a CI job already built
//
// The staging layout mirrors the repository: staging/Demos/D1/index.html, and so on.

type Build = "vite" | "godot" | "static";

type Project = {
  path: string;
  label: string;
  group: string;
  title: string;
  description: string;
  stack: string[];
  repo: string;
  legacySite: string | null;
  head: string;
  build: Build;
};

type Manifest = {
  site: { title: string; course: string; lede: string; repo: string };
  projects: Project[];
};

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const DIST = `${ROOT}/dist`;

const flags = new Map<string, string>();
for (const arg of Deno.args) {
  const match = arg.match(/^--([\w-]+)(?:=(.*))?$/);
  if (match) flags.set(match[1], match[2] ?? "true");
}
const staging = flags.get("staging");

const manifest: Manifest = JSON.parse(
  await Deno.readTextFile(`${ROOT}/projects.json`),
);

/** Runs git at the archive root; returns "" when git is unavailable. */
function git(args: string[]): string {
  try {
    const out = new Deno.Command("git", {
      args,
      cwd: ROOT,
      stdout: "piped",
      stderr: "null",
    }).outputSync();
    return out.success ? new TextDecoder().decode(out.stdout).trim() : "";
  } catch {
    return "";
  }
}

async function copyTree(from: string, to: string): Promise<void> {
  await Deno.mkdir(to, { recursive: true });
  for await (const entry of Deno.readDir(from)) {
    const source = `${from}/${entry.name}`;
    const target = `${to}/${entry.name}`;
    if (entry.isDirectory) await copyTree(source, target);
    else if (entry.isFile) await Deno.copyFile(source, target);
    else if (entry.isSymlink) {
      await Deno.symlink(await Deno.readLink(source), target);
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Reads <title> from an HTML file so the static index can name each sketch. */
async function pageTitle(file: string): Promise<string> {
  try {
    const html = await Deno.readTextFile(file);
    return html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ??
      file.split("/").pop()!.replace(/\.html$/, "");
  } catch {
    return file.split("/").pop()!.replace(/\.html$/, "");
  }
}

/** Small landing page for a project that ships plain .html files instead of a build. */
async function writeStaticIndex(
  project: Project,
  outDir: string,
): Promise<void> {
  const pages: { file: string; title: string }[] = [];
  for await (const entry of Deno.readDir(`${ROOT}/${project.path}`)) {
    if (entry.isFile && entry.name.endsWith(".html")) {
      pages.push({
        file: entry.name,
        title: await pageTitle(`${ROOT}/${project.path}/${entry.name}`),
      });
    }
  }
  pages.sort((a, b) => a.file.localeCompare(b.file));
  const items = pages
    .map(
      (page) =>
        `<li><a href="./${encodeURIComponent(page.file)}">${
          escapeHtml(page.title)
        }</a><span>${escapeHtml(page.file)}</span></li>`,
    )
    .join("\n        ");
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(project.title)}</title>
    <style>
      body { font: 16px/1.6 ui-sans-serif, system-ui, sans-serif; max-width: 40rem; margin: 4rem auto; padding: 0 1.25rem; color: #16161a; background: #f6f5f1; }
      h1 { font-size: 1.6rem; letter-spacing: -0.02em; margin: 0 0 0.4rem; }
      p { color: #64645f; margin: 0 0 1.6rem; }
      ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.6rem; }
      li { display: flex; justify-content: space-between; gap: 1rem; padding: 0.9rem 1rem; background: #fff; border: 1px solid #e2dfd7; border-radius: 12px; }
      span { color: #9a9aa4; font-family: ui-monospace, monospace; font-size: 0.8rem; }
      a { color: #2f5fe0; font-weight: 600; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(project.title)}</h1>
    <p>${escapeHtml(project.description)}</p>
    <ul>
        ${items}
    </ul>
  </body>
</html>
`;
  await Deno.writeTextFile(`${outDir}/index.html`, html);
}

function card(project: Project, built: boolean): string {
  const stats: string[] = [];
  if (built) {
    const commits = git([
      "rev-list",
      "--count",
      "--no-merges",
      "HEAD",
      "--",
      project.path,
    ]);
    const updated = git(["log", "-1", "--format=%cs", "--", project.path]);
    if (commits) stats.push(`${commits} commit${commits === "1" ? "" : "s"}`);
    if (updated) stats.push(`updated ${updated}`);
  } else {
    stats.push(`<span class="badge">Build unavailable</span>`);
  }
  const source = `${manifest.site.repo}/tree/main/${project.path}`;
  const href = `${project.path}/`;
  const title = built
    ? `<a href="${href}">${escapeHtml(project.title)}</a>`
    : escapeHtml(project.title);
  const open = built ? `<a href="${href}">Open</a>` : "";
  return `        <article class="card" data-stack="${
    escapeHtml(project.stack.join("|"))
  }">
          <div class="card-top">
            <span class="label">${escapeHtml(project.label)}</span>
            <span class="stack">${escapeHtml(project.stack.join(" · "))}</span>
          </div>
          <h3>${title}</h3>
          <p>${escapeHtml(project.description)}</p>
          <div class="card-foot">
            <span>${stats.join(" · ")}</span>
            <span class="links">${open}<a class="src" href="${source}">Source</a></span>
          </div>
        </article>`;
}

function sections(cards: Map<string, string[]>): string {
  const groups = ["Demos", "Exercises", "Section"];
  const titles: Record<string, string> = {
    Demos: "Demos",
    Exercises: "Exercises",
    Section: "Section activities",
  };
  const blocks: string[] = [];
  for (const group of groups) {
    const list = cards.get(group);
    if (!list?.length) continue;
    blocks.push(`      <section class="group" id="${group.toLowerCase()}">
        <div class="group-head">
          <h2>${titles[group]}</h2>
          <span class="count">${list.length} project${
      list.length === 1 ? "" : "s"
    }</span>
        </div>
        <div class="grid">
${list.join("\n")}
        </div>
      </section>`);
  }
  return blocks.join("\n\n");
}

// --- gather -----------------------------------------------------------------

await Deno.remove(DIST, { recursive: true }).catch(() => {});
await Deno.mkdir(DIST, { recursive: true });

const built = new Map<string, boolean>();
for (const project of manifest.projects) {
  const outDir = `${DIST}/${project.path}`;
  let ok = false;

  if (staging) {
    // CI already produced one artifact per project; copy it into place.
    try {
      await Deno.stat(`${staging}/${project.path}`);
      await copyTree(`${staging}/${project.path}`, outDir);
      ok = true;
    } catch {
      ok = false;
    }
  } else if (project.build === "static") {
    for await (const entry of Deno.readDir(`${ROOT}/${project.path}`)) {
      if (entry.isFile && entry.name.endsWith(".html")) {
        await Deno.mkdir(outDir, { recursive: true });
        await Deno.copyFile(
          `${ROOT}/${project.path}/${entry.name}`,
          `${outDir}/${entry.name}`,
        );
        ok = true;
      }
    }
    if (ok) await writeStaticIndex(project, outDir);
  } else {
    try {
      await Deno.stat(`${ROOT}/${project.path}/dist`);
      await copyTree(`${ROOT}/${project.path}/dist`, outDir);
      ok = true;
    } catch {
      ok = false;
    }
  }
  built.set(project.path, ok);
}

// --- render -----------------------------------------------------------------

const byGroup = new Map<string, string[]>();
for (const project of manifest.projects) {
  const list = byGroup.get(project.group) ?? [];
  list.push(card(project, built.get(project.path) ?? false));
  byGroup.set(project.group, list);
}

const totalCommits = git(["rev-list", "--count", "HEAD"]) || "0";
const latest = git(["log", "-1", "--format=%cs"]) || "";
const builtCount = [...built.values()].filter(Boolean).length;

const meta = [
  `<span class="stat"><b>${manifest.projects.length}</b> projects</span>`,
  `<span class="stat"><b>${totalCommits}</b> commits</span>`,
  `<span class="stat"><b>${builtCount}</b> live</span>`,
  latest ? `<span class="stat">updated <b>${latest}</b></span>` : "",
].filter(Boolean).join("\n        ");

for (const file of ["styles.css", "main.js", "favicon.svg"]) {
  await Deno.copyFile(`${ROOT}/site/${file}`, `${DIST}/${file}`);
}
await Deno.writeTextFile(`${DIST}/.nojekyll`, "");

const template = await Deno.readTextFile(`${ROOT}/site/index.html`);
const page = template
  .replaceAll("<!--TITLE-->", escapeHtml(manifest.site.title))
  .replaceAll(
    "<!--DESCRIPTION-->",
    escapeHtml(
      "Projects from CMPM 121, collected into one repository with their full history.",
    ),
  )
  .replaceAll("<!--COURSE-->", escapeHtml(manifest.site.course))
  .replaceAll("<!--LEDE-->", escapeHtml(manifest.site.lede))
  .replaceAll("<!--REPO-->", manifest.site.repo)
  .replace("<!--META-->", meta)
  .replace("<!--SECTIONS-->", sections(byGroup));

await Deno.writeTextFile(`${DIST}/index.html`, page);

// --- report -----------------------------------------------------------------

console.log(`Built ${DIST}`);
for (const project of manifest.projects) {
  const status = built.get(project.path) ? "ok" : "missing build";
  console.log(`  ${project.path.padEnd(24)} ${status}`);
}
if (staging && builtCount < manifest.projects.length) {
  const missing = manifest.projects
    .filter((p) => !built.get(p.path))
    .map((p) => p.label)
    .join(", ");
  console.log(`::warning::No build artifact for: ${missing}`);
}
