import { assertEquals } from "jsr:@std/assert@1";
import { initialState, PAYOUT_PER_TRACK, recordTrack } from "./state.ts";

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
