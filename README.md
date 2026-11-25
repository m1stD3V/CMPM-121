# CMPM 121 — project archive

Every project from the quarter, in one repository, with its full history — and
one site that links to all of them.

This is not a monorepo of submodules or nested repositories: each project's
commits were imported into this repository's object store. `git log -- Demos/D1`
gives the real history of that project, including the commits made before this
archive existed. `ARCHIVE.md` records where each project came from and how to
restore it.

## Layout

```
Demos/       D1–D4, the four larger builds
Exercises/   E1–E5
Section/     S1 and the D1 AI build
site/        source of the landing page
scripts/     build-site.ts and sync-projects.ts
archives/    one git bundle per original repository, byte for byte
projects.json  the manifest: titles, descriptions, stacks, source repos
```

Each folder is a normal directory with normal files. There is no `.git` inside
them; this repository owns everything under it.

## Commands

```sh
deno task build     # build every project with the right base path, then the hub
deno task serve     # preview at http://localhost:8000/CMPM-121/
deno task site      # assemble dist/ from existing project builds (what CI does)
deno task sync      # refresh history from the GitHub remotes
deno task sync --local   # refresh from the project folders on disk
deno task check     # formatting, lint, and type-check for the archive's own code
```

`deno task build` skips the Godot project unless you pass `--godot` (it
downloads Godot into `Demos/D4/.tools/` first). A stale `dist/` built for a
different base path is refused rather than published, so `deno task site` alone
can only use builds that will actually resolve.

Building one project by hand, exactly as CI does:

```sh
cd Demos/D1
REPO_NAME=CMPM-121/Demos/D1 deno task ci
```

`REPO_NAME` is what the project's `vite.config.js` turns into the `base` path,
so the same source builds correctly whether it is served at `/Demos/D1/` from
this site or at the root of its own repository.

## Deployment

`pages.yml` reads `projects.json`, builds every project in its own matrix job,
then assembles the hub and deploys one Pages artifact. A project that fails to
build does not block the rest: its card shows **Build unavailable** and the job
is annotated. The hub itself is plain HTML/CSS/JS — no framework, no client-side
routing.

Pages is served from the repository name: `https://m1std3v.github.io/CMPM-121/`,
with each project at `/CMPM-121/<folder>/`.

## Adding a project

1. Put the folder under `Demos/`, `Exercises/`, or `Section/`.
2. Add an entry to `projects.json` (`path`, `label`, `group`, `title`,
   `description`, `stack`, `repo`, `head`, `build`).
3. `deno task sync --local` imports its history and bundles the origin.
4. Commit.

## One caution

Each project still carries its old `deno task setup`, which sets the
repository's `core.hooksPath` to that project's `.githooks`. Don't run it here:
it would install one project's pre-commit check for the whole archive. Use
`deno task check`.

## Provenance and retirement

`ARCHIVE.md` lists the original repository for every folder, and
`archives/*.bundle` holds each one exactly as it was published. When the
individual repositories are retired, delete `.github/workflows/sync.yml`; the
archive stops needing them.

The scheduled sync fetches each repository anonymously, so it works while they
are public (as GitHub Pages requires on a free plan). If one is private, run
`deno task sync --local` from a machine that already has it checked out.
