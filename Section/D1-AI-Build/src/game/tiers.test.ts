import { assertEquals } from "jsr:@std/assert@1";
import { currentTier, STUDIO_TIERS, tierIndexFor } from "./tiers.ts";

Deno.test("tiers are ordered from cheapest to priciest requirement", () => {
  for (let i = 1; i < STUDIO_TIERS.length; i++) {
    assertEquals(
      STUDIO_TIERS[i].earningsRequired > STUDIO_TIERS[i - 1].earningsRequired,
      true,
      STUDIO_TIERS[i].name,
    );
  }
});

Deno.test("the first tier has no earnings requirement", () => {
  assertEquals(STUDIO_TIERS[0].earningsRequired, 0);
});

Deno.test("a fresh studio starts at the first tier", () => {
  assertEquals(tierIndexFor(0), 0);
});

Deno.test("earnings land in the tier whose requirement they have met", () => {
  const home = STUDIO_TIERS[1].earningsRequired;
  const project = STUDIO_TIERS[2].earningsRequired;
  assertEquals(tierIndexFor(home - 1), 0);
  assertEquals(tierIndexFor(home), 1);
  assertEquals(tierIndexFor(project - 1), 1);
  assertEquals(tierIndexFor(project), 2);
});

Deno.test("huge earnings reach the final tier without overshooting it", () => {
  assertEquals(tierIndexFor(Number.MAX_SAFE_INTEGER), STUDIO_TIERS.length - 1);
});

Deno.test("negative earnings do not unlock any tier", () => {
  assertEquals(tierIndexFor(-100), 0);
});

Deno.test("currentTier exposes the tier and the next rung", () => {
  const reached = currentTier(0);
  assertEquals(reached.index, 0);
  assertEquals(reached.tier, STUDIO_TIERS[0]);
  assertEquals(reached.next, STUDIO_TIERS[1]);

  const last = currentTier(Number.MAX_SAFE_INTEGER);
  assertEquals(last.index, STUDIO_TIERS.length - 1);
  assertEquals(last.next, null);
});
