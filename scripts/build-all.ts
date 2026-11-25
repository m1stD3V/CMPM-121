// Builds every project the way Pages will serve it, then assembles the hub.
//
//   deno task build              all projects except the Godot one
//   deno task build --godot      include D4 (downloads Godot into .tools/ first)
//   deno task build --only=D1    one project, by label

type Project = {
  path: string;
  label: string;
  build: "vite" | "godot" | "static";
  buildCommand?: string;
};

type Manifest = {
  site: { repo: string };
  projects: Project[];
};

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const manifest: Manifest = JSON.parse(
  await Deno.readTextFile(`${ROOT}/projects.json`),
) as Manifest;

const flags = new Set<string>();
const values = new Map<string, string>();
for (const arg of Deno.args) {
  const match = arg.match(/^--([\w-]+)(?:=(.*))?$/);
  if (!match) continue;
  if (match[2] === undefined) flags.add(match[1]);
  else values.set(match[1], match[2]);
}

// The Pages path is the repository name: /CMPM-121/…
const base = manifest.site.repo.replace(/\/$/, "").split("/").pop()!;
const only = values.get("only");
const withGodot = flags.has("godot");

async function run(args: string[], cwd: string, env: Record<string, string>) {
  const command = new Deno.Command(args[0], {
    args: args.slice(1),
    cwd,
    env,
    stdout: "inherit",
    stderr: "inherit",
  });
  const { code } = await command.output();
  return code;
}

let failed = 0;
for (const project of manifest.projects) {
  if (only && project.label !== only) continue;
  if (project.build === "static") {
    console.log(`- ${project.path}: no build step`);
    continue;
  }
  if (project.build === "godot" && !withGodot) {
    console.log(`- ${project.path}: skipped (pass --godot to include it)`);
    continue;
  }

  const env = { REPO_NAME: `${base}/${project.path}` };
  console.log(`\n▶ ${project.path}  (base /${env.REPO_NAME}/)`);

  if (project.build === "godot") {
    const setup = await run(
      ["deno", "task", "setup"],
      `${ROOT}/${project.path}`,
      env,
    );
    if (setup !== 0) {
      failed++;
      continue;
    }
  }

  const command = project.buildCommand ?? "deno task ci";
  const code = await run(["sh", "-c", command], `${ROOT}/${project.path}`, env);
  if (code !== 0) failed++;
}

console.log("\n▶ hub");
const site = await run(["deno", "task", "site"], ROOT, {});
if (site !== 0) failed++;

if (failed > 0) {
  console.error(`\n${failed} step(s) failed.`);
  Deno.exit(1);
}
console.log("\nDone. Run `deno task serve` to look at it.");
