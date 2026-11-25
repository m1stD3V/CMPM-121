// Imports every project's history into this repository, and refreshes it later.
//
//   deno task sync                 pull each project from its GitHub remote
//   deno task sync --local         pull from the project folders on disk (first run)
//   deno task sync --only=D1       one project, by label
//   deno task sync --no-merge      update refs without touching main
//   deno task sync --push          commit and push main plus the project branches
//
// Two forms of history are kept, on purpose:
//   * archives/<label>.bundle — each original repository, byte for byte, with its
//     original commit hashes and every branch. Restorable with `git clone`.
//   * refs/heads/projects/<label>/<branch> — the same commits re-rooted under the
//     project's folder, so history reads naturally inside the archive.

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
  build: "vite" | "godot" | "static";
};

type Manifest = {
  site: { title: string; course: string; lede: string; repo: string };
  projects: Project[];
};

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const OWNER = "m1stD3V";
// Only needed when the source repositories are private; public ones need nothing.
const TOKEN = Deno.env.get("SYNC_TOKEN") ?? "";
const manifest: Manifest = JSON.parse(
  await Deno.readTextFile(`${ROOT}/projects.json`),
);

const flags = new Set<string>();
const values = new Map<string, string>();
for (const arg of Deno.args) {
  const match = arg.match(/^--([\w-]+)(?:=(.*))?$/);
  if (!match) continue;
  if (match[2] === undefined) flags.add(match[1]);
  else values.set(match[1], match[2]);
}

const local = flags.has("local");
// Where the working copies live, when --local is used from somewhere else.
const sourceRoot = values.get("source-root") ?? ROOT;
const push = flags.has("push");
const neverMerge = flags.has("no-merge") || values.get("merge") === "false";
const only = values.get("only");

function git(
  args: string[],
  cwd = ROOT,
  env: Record<string, string> = {},
): string {
  const result = new Deno.Command("git", {
    args,
    cwd,
    env,
    stdout: "piped",
    stderr: "piped",
  }).outputSync();
  if (!result.success) {
    const err = new TextDecoder().decode(result.stderr).trim();
    const shown = TOKEN
      ? `${args.join(" ")}\n${err}`.replaceAll(TOKEN, "***")
      : `${args.join(" ")}\n${err}`;
    throw new Error(`git ${shown}`);
  }
  return new TextDecoder().decode(result.stdout).trim();
}

/** Moves every path in a commit into the project's folder, for readable history. */
function indexFilter(path: string): string {
  // Written into a fresh index: the old root-level entries must not survive.
  return [
    "git ls-files -s -z",
    `| sed -z "s|\\t|\\t${path}/|"`,
    "| GIT_INDEX_FILE=$GIT_INDEX_FILE.new git update-index -z --index-info",
    '&& mv "$GIT_INDEX_FILE.new" "$GIT_INDEX_FILE"',
  ].join(" ");
}

const ARCHIVES = `${ROOT}/archives`;
const TMP = `${ROOT}/.git/sync`;

await Deno.mkdir(ARCHIVES, { recursive: true });
await Deno.remove(TMP, { recursive: true }).catch(() => {});
await Deno.mkdir(TMP, { recursive: true });

const selected = manifest.projects.filter((p) => !only || p.label === only);
if (selected.length === 0) {
  console.error(`No project with label "${only}".`);
  Deno.exit(1);
}

for (const project of selected) {
  const source = local
    ? `${sourceRoot}/${project.path}`
    : TOKEN
    ? `https://x-access-token:${TOKEN}@github.com/${OWNER}/${project.repo}.git`
    : `https://github.com/${OWNER}/${project.repo}.git`;
  console.log(
    `• ${project.path.padEnd(22)} ← ${
      local ? "working copy" : `${OWNER}/${project.repo}`
    }`,
  );

  // Exact copy of the repository: original hashes, original branch names.
  // A working copy keeps some of its branches only as remote-tracking refs, so
  // those are promoted to real branches before the bundle is written.
  const mirror = `${TMP}/${project.label}-mirror.git`;
  git(["clone", "--quiet", "--mirror", source, mirror]);
  const tracked = git(
    [
      "for-each-ref",
      "--format=%(refname)\t%(objectname)",
      "refs/remotes/origin/",
    ],
    mirror,
  )
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t"))
    .filter(([ref]) => ref !== "refs/remotes/origin/HEAD");
  for (const [ref, sha] of tracked) {
    git([
      "update-ref",
      `refs/heads/${ref.replace("refs/remotes/origin/", "")}`,
      sha,
    ], mirror);
  }
  for (
    const ref of git(
      ["for-each-ref", "--format=%(refname)", "refs/remotes/"],
      mirror,
    )
      .split("\n")
      .filter(Boolean)
  ) {
    git(["update-ref", "-d", ref], mirror);
  }

  const bundle = `${ARCHIVES}/${project.label}.bundle`;
  git(["bundle", "create", bundle, "--all"], mirror);
  git(["bundle", "verify", bundle], mirror);

  // Browsable copy: the same commits, re-rooted at the project's folder.
  // Cloning the mirror means every branch is available; a clone only checks out
  // one of them, so the rest are materialised as local branches here.
  const work = `${TMP}/${project.label}-work`;
  git(["clone", "--quiet", "--no-hardlinks", mirror, work]);
  const current = git(["symbolic-ref", "--short", "HEAD"], work);
  const heads = git(
    ["for-each-ref", "--format=%(refname)", "refs/remotes/origin/"],
    work,
  )
    .split("\n")
    .filter(Boolean)
    .filter((ref) => ref !== "refs/remotes/origin/HEAD")
    .map((ref) => ref.replace("refs/remotes/origin/", ""));
  for (const name of heads) {
    if (name !== current) {
      git(["branch", "--quiet", name, `origin/${name}`], work);
    }
  }

  git(
    [
      "filter-branch",
      "-f",
      "--prune-empty",
      "--index-filter",
      indexFilter(project.path),
      "--",
      "--all",
    ],
    work,
    { FILTER_BRANCH_SQUELCH_WARNING: "1" },
  );
  git(
    [
      "push",
      "--quiet",
      "--force",
      "--prune",
      ROOT,
      `refs/heads/*:refs/heads/projects/${project.label}/*`,
    ],
    work,
  );

  await Deno.remove(mirror, { recursive: true }).catch(() => {});
  await Deno.remove(work, { recursive: true }).catch(() => {});
}

// --- join the project histories to main -------------------------------------

if (!neverMerge) {
  for (const project of selected) {
    const tip = `projects/${project.label}/${project.head}`;
    let exists = true;
    try {
      git(["rev-parse", "--verify", "--quiet", tip]);
    } catch {
      exists = false;
    }
    if (!exists) {
      const branches = git([
        "for-each-ref",
        "--format=%(refname:short)",
        `refs/heads/projects/${project.label}/`,
      ]);
      throw new Error(
        `Project ${project.label} has no branch "${project.head}".\n` +
          `Branches found:\n${branches}`,
      );
    }

    const merged = new Deno.Command("git", {
      args: ["merge-base", "--is-ancestor", tip, "HEAD"],
      cwd: ROOT,
      stdout: "null",
      stderr: "null",
    }).outputSync();
    if (merged.success) continue;

    console.log(`  merging ${tip} into main`);
    try {
      git([
        "merge",
        "--no-edit",
        "--allow-unrelated-histories",
        "-X",
        "theirs",
        tip,
      ]);
    } catch (error) {
      git(["merge", "--abort"]).trim();
      throw new Error(
        `Merge of ${tip} conflicted; the archive needs a human.\n${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

// --- publish ----------------------------------------------------------------

git(["add", "-A", "archives"]);

const dirty = new Deno.Command("git", {
  args: ["diff", "--cached", "--quiet"],
  cwd: ROOT,
  stdout: "null",
  stderr: "null",
}).outputSync();
if (!dirty.success) {
  git([
    "commit",
    "-q",
    "-m",
    "sync: refresh archived origin repositories",
  ]);
}

if (push) {
  console.log("pushing main and project branches…");
  git(["push", "--quiet", "origin", "HEAD:main"]);
  git([
    "push",
    "--quiet",
    "--force",
    "--prune",
    "origin",
    "refs/heads/projects/*:refs/heads/projects/*",
  ]);
}

console.log("done");
