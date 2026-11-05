import { assertAlmostEquals, assertEquals } from "jsr:@std/assert@1";
import {
  applyRoyalties,
  initialState,
  ownedCount,
  purchaseEquipment,
  recordTrack,
} from "./state.ts";

Deno.test("a fresh studio starts with no money and no gear", () => {
  assertEquals(initialState(), { money: 0, ownedEquipment: {} });
});

Deno.test("recording a track pays out its royalty", () => {
  const state = initialState();
  const recorded = recordTrack(state);
  assertEquals(recorded.money, 1);
});

Deno.test("repeated recording accumulates payouts", () => {
  let state = initialState();
  for (let i = 0; i < 10; i++) {
    state = recordTrack(state);
  }
  assertEquals(state.money, 10);
});

Deno.test("recording does not mutate the state it was given", () => {
  const state = initialState();
  recordTrack(state);
  assertEquals(state, { money: 0, ownedEquipment: {} });
});

Deno.test("unowned equipment reports a count of zero", () => {
  assertEquals(ownedCount(initialState(), "usb-mic"), 0);
});

Deno.test("royalties accrue from elapsed seconds, not ticks", () => {
  const afterTenSeconds = applyRoyalties(initialState(), 10);
  assertEquals(afterTenSeconds.money, 1); // baseline 0.10/sec
});

Deno.test("tiny frame gaps still earn their share of royalties", () => {
  let advanced = initialState();
  for (let i = 0; i < 600; i++) {
    advanced = applyRoyalties(advanced, 1 / 60);
  }
  assertAlmostEquals(advanced.money, 1, 1e-9);
});

Deno.test("elapsed time that is not positive changes nothing", () => {
  const state = initialState();
  assertEquals(applyRoyalties(state, 0), state);
  assertEquals(applyRoyalties(state, -5), state);
});

Deno.test("applying royalties does not mutate the state it was given", () => {
  const state = initialState();
  applyRoyalties(state, 10);
  assertEquals(state, { money: 0, ownedEquipment: {} });
});

Deno.test("buying equipment deducts its price and records ownership", () => {
  const attempt = purchaseEquipment(
    { ...initialState(), money: 100 },
    "usb-mic",
  );
  assertEquals(attempt.ok, true);
  if (!attempt.ok) return;
  assertEquals(attempt.state.money, 85); // mic costs $15
  assertEquals(ownedCount(attempt.state, "usb-mic"), 1);
});

Deno.test("a purchase the studio cannot afford is rejected untouched", () => {
  const broke = { ...initialState(), money: 14 };
  assertEquals(purchaseEquipment(broke, "usb-mic"), {
    ok: false,
    reason: "insufficient-funds",
  });
  assertEquals(broke, { money: 14, ownedEquipment: {} });
});

Deno.test("a purchase with exactly the right price is allowed", () => {
  const funded = { ...initialState(), money: 15 };
  assertEquals(purchaseEquipment(funded, "usb-mic").ok, true);
});

Deno.test("unknown equipment ids are rejected", () => {
  const rich = { ...initialState(), money: 1_000_000 };
  assertEquals(purchaseEquipment(rich, "does-not-exist"), {
    ok: false,
    reason: "unknown-equipment",
  });
});

Deno.test("purchasing does not mutate the state it was given", () => {
  const state = { ...initialState(), money: 1000 };
  purchaseEquipment(state, "usb-mic");
  assertEquals(state, { money: 1000, ownedEquipment: {} });
});

Deno.test("buying more units follows the rising cost curve", () => {
  let state = { ...initialState(), money: 10_000 };
  let moneySpent = 0;
  for (let i = 0; i < 10; i++) {
    const attempt = purchaseEquipment(state, "usb-mic");
    if (!attempt.ok) throw new Error(`purchase ${i} should succeed`);
    moneySpent += state.money - attempt.state.money;
    state = attempt.state;
    assertEquals(ownedCount(state, "usb-mic"), i + 1);
  }
  assertEquals(state.money, 10_000 - moneySpent);
});
