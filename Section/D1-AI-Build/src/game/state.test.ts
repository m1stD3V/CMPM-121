import { assertAlmostEquals, assertEquals } from "jsr:@std/assert@1";
import {
  applyRoyalties,
  BASE_ROYALTY_RATE,
  initialState,
  PAYOUT_PER_TRACK,
  recordTrack,
  royaltiesPerSecond,
} from "./state.ts";

Deno.test("a fresh studio starts with no money", () => {
  assertEquals(initialState(), { money: 0 });
});

Deno.test("recording a track pays out its royalty", () => {
  const state = initialState();
  const recorded = recordTrack(state);
  assertEquals(recorded.money, PAYOUT_PER_TRACK);
});

Deno.test("repeated recording accumulates payouts", () => {
  let state = initialState();
  for (let i = 0; i < 10; i++) {
    state = recordTrack(state);
  }
  assertEquals(state.money, 10 * PAYOUT_PER_TRACK);
});

Deno.test("recording does not mutate the state it was given", () => {
  const state = initialState();
  recordTrack(state);
  assertEquals(state, { money: 0 });
});

Deno.test("royalties trickle in at the baseline rate", () => {
  assertEquals(royaltiesPerSecond(initialState()), BASE_ROYALTY_RATE);
});

Deno.test("royalties accrue from elapsed seconds, not ticks", () => {
  const state = initialState();
  const afterTenSeconds = applyRoyalties(state, 10);
  assertEquals(afterTenSeconds.money, BASE_ROYALTY_RATE * 10);
});

Deno.test("tiny frame gaps still earn their share of royalties", () => {
  const state = initialState();
  let advanced = state;
  for (let i = 0; i < 600; i++) {
    advanced = applyRoyalties(advanced, 1 / 60);
  }
  assertAlmostEquals(advanced.money, BASE_ROYALTY_RATE * 10, 1e-9);
});

Deno.test("elapsed time that is not positive changes nothing", () => {
  const state = initialState();
  assertEquals(applyRoyalties(state, 0), state);
  assertEquals(applyRoyalties(state, -5), state);
});

Deno.test("applying royalties does not mutate the state it was given", () => {
  const state = initialState();
  applyRoyalties(state, 10);
  assertEquals(state, { money: 0 });
});
