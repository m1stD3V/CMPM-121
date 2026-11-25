# Studio Clicker

A cookie-clicker-inspired incremental game about building a music career: start
with a bedroom setup and a dream, record tracks to earn royalties, reinvest in
studio equipment, and work your way up to a full record label.

**Play it:** https://m1std3v.github.io/D1-AI-Build/

## How it works

- **Record tracks** — click the vinyl to lay down a take; every take pays a
  royalty.
- **Royalties accrue over time** — released music keeps streaming while you
  wait, so income grows even when you are not clicking.
- **Buy equipment** — spend royalties on gear from the catalog. Each item
  raises per-track payouts or per-second royalty income, and repeated
  purchases keep getting more expensive.
- **Level up the studio** — lifetime earnings unlock new tiers (Bedroom Setup
  through Record Label), and each tier reveals more professional gear.

## Run and build locally

Requires [Deno](https://deno.com/) 2.9.7+.

```sh
deno task setup   # enable pre-commit checks (once per clone)
deno task dev     # start the Vite dev server
deno task ci      # fmt + lint + typecheck + tests + production build
deno task preview # serve the production build from dist/
```

Deployments run automatically on pushes to `main` via GitHub Actions.

## Where things live

| Path                       | Responsibility                                                                |
| -------------------------- | ----------------------------------------------------------------------------- |
| `src/main.ts`              | Wires the game to the DOM and runs the animation loop.                        |
| `src/game/state.ts`        | The studio's state and the only legal transitions (record, accrue, purchase). |
| `src/game/equipment.ts`    | The equipment catalog — pure content data and cost curves.                    |
| `src/game/economy.ts`      | Income rules: how owned gear turns into payouts and royalties.                |
| `src/game/tiers.ts`        | Studio tiers and the earnings thresholds that unlock them.                    |
| `src/ui/equipment-list.ts` | Renders the catalog as rows and forwards purchase requests.                   |
| `src/game/*.test.ts`       | Unit tests for every module's rules and edge cases.                           |

## Design revision

The original design put the catalog, income rules, and state transitions in one
`state.ts` module. As content grew, that file mixed three responsibilities, so
it was split along SRP lines: `equipment.ts` (data), `economy.ts` (rules), and
`state.ts` (transitions). Balancing the game now means editing numbers in the
catalog rather than touching rule code. See the revision story in the history:
[refactor: split game logic](https://github.com/m1std3V/D1-AI-Build/commit/b2013a0ab6d8bcbc24b936ab17f9fdbe14b0bda8)
and
[feat: extend the catalog](https://github.com/m1std3V/D1-AI-Build/commit/6804989)
where the split paid off by adding six items with no new rule code.

## Credits

Tooling adapted from the [CMPM 121 Fall 2026 S01 starter](https://github.com/ucsc-cmpm-121-f26/s01-starter/tree/8976537bb6b7775712f2f1e6f2f3d95d3a4d2e65), which has no explicit
repository license. No new license is assigned to that material. The D1
scaffold and the original SVG were authored with OpenAI GPT-6 Astra assistance.
Dependencies retain their respective licenses.
