import { assertAlmostEquals, assertEquals } from "jsr:@std/assert@1";
import {
  applyRoyalties,
  BASE_ROYALTY_RATE,
  EQUIPMENT_CATALOG,
  equipmentCost,
  initialState,
  ownedCount,
  PAYOUT_PER_TRACK,
  payoutPerTrack,
  purchaseEquipment,
  recordTrack,
  royaltiesPerSecond,
} from "./state.ts";

Deno.test("a fresh studio starts with no money and no gear", () => {
  assertEquals(initialState(), { money: 0, ownedEquipment: {} });
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
  assertEquals(state, { money: 0, ownedEquipment: {} });
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
  assertEquals(state, { money: 0, ownedEquipment: {} });
});

Deno.test("the first unit of gear costs its base price", () => {
  for (const item of EQUIPMENT_CATALOG) {
    assertEquals(equipmentCost(item, 0), item.baseCost);
  }
});

Deno.test("repeated gear purchases keep getting more expensive", () => {
  for (const item of EQUIPMENT_CATALOG) {
    const first = equipmentCost(item, 0);
    const second = equipmentCost(item, 1);
    const third = equipmentCost(item, 2);
    assertEquals(second > first, true, item.id);
    assertEquals(third > second, true, item.id);
  }
});

Deno.test("costs are rounded up to whole dollars", () => {
  for (const item of EQUIPMENT_CATALOG) {
    for (let count = 0; count < 50; count++) {
      assertEquals(Number.isInteger(equipmentCost(item, count)), true, item.id);
    }
  }
});

Deno.test("unowned gear contributes nothing to payouts or royalties", () => {
  const state = initialState();
  assertEquals(payoutPerTrack(state), PAYOUT_PER_TRACK);
  assertEquals(royaltiesPerSecond(state), BASE_ROYALTY_RATE);
});

Deno.test("buying a payout mic earns more per recorded track", () => {
  const mic = EQUIPMENT_CATALOG.find((item) => item.id === "usb-mic")!;
  const withMic = { ...initialState(), money: mic.baseCost };
  const purchase = purchaseEquipment(withMic, mic.id);

  assertEquals(purchase.ok, true);
  if (!purchase.ok) return;
  assertEquals(purchase.state.money, 0);
  assertEquals(
    payoutPerTrack(purchase.state),
    PAYOUT_PER_TRACK + mic.payoutBonus,
  );
  assertEquals(royaltiesPerSecond(purchase.state), BASE_ROYALTY_RATE);
});

Deno.test("buying a royalty item earns more per second", () => {
  const keyboard = EQUIPMENT_CATALOG.find((item) =>
    item.id === "midi-keyboard"
  )!;
  const withKeyboard = { ...initialState(), money: keyboard.baseCost };
  const purchase = purchaseEquipment(withKeyboard, keyboard.id);

  assertEquals(purchase.ok, true);
  if (!purchase.ok) return;
  assertEquals(purchase.state.money, 0);
  assertEquals(
    royaltiesPerSecond(purchase.state),
    BASE_ROYALTY_RATE + keyboard.royaltyRate,
  );
  assertEquals(payoutPerTrack(purchase.state), PAYOUT_PER_TRACK);
});

Deno.test("a second unit costs more and stacks its effect", () => {
  const mic = EQUIPMENT_CATALOG.find((item) => item.id === "usb-mic")!;
  const secondUnitCost = equipmentCost(mic, 1);
  const withMic = { ...initialState(), money: mic.baseCost + secondUnitCost };
  const firstPurchase = purchaseEquipment(withMic, mic.id);
  if (!firstPurchase.ok) throw new Error("first purchase should succeed");

  const secondPurchase = purchaseEquipment(firstPurchase.state, mic.id);
  assertEquals(secondPurchase.ok, true);
  if (!secondPurchase.ok) return;
  assertEquals(ownedCount(secondPurchase.state, mic.id), 2);
  assertEquals(
    payoutPerTrack(secondPurchase.state),
    PAYOUT_PER_TRACK + 2 * mic.payoutBonus,
  );
});

Deno.test("a purchase the studio cannot afford is rejected untouched", () => {
  const mic = EQUIPMENT_CATALOG.find((item) => item.id === "usb-mic")!;
  const broke = { ...initialState(), money: mic.baseCost - 1 };
  const attempt = purchaseEquipment(broke, mic.id);

  assertEquals(attempt, { ok: false, reason: "insufficient-funds" });
  assertEquals(broke, { money: mic.baseCost - 1, ownedEquipment: {} });
});

Deno.test("a purchase with exactly the right price is allowed", () => {
  const mic = EQUIPMENT_CATALOG.find((item) => item.id === "usb-mic")!;
  const funded = { ...initialState(), money: mic.baseCost };
  const attempt = purchaseEquipment(funded, mic.id);
  assertEquals(attempt.ok, true);
});

Deno.test("unknown equipment ids are rejected", () => {
  const state = { ...initialState(), money: 1000000 };
  assertEquals(purchaseEquipment(state, "does-not-exist"), {
    ok: false,
    reason: "unknown-equipment",
  });
});

Deno.test("purchasing does not mutate the state it was given", () => {
  const mic = EQUIPMENT_CATALOG.find((item) => item.id === "usb-mic")!;
  const funded = { ...initialState(), money: mic.baseCost };
  purchaseEquipment(funded, mic.id);
  assertEquals(funded, { money: mic.baseCost, ownedEquipment: {} });
});

Deno.test("costs keep climbing even after many purchases", () => {
  const mic = EQUIPMENT_CATALOG.find((item) => item.id === "usb-mic")!;
  let state = { ...initialState(), money: Number.MAX_SAFE_INTEGER };
  let lastCost = equipmentCost(mic, ownedCount(state, mic.id));
  for (let i = 0; i < 50; i++) {
    const attempt = purchaseEquipment(state, mic.id);
    if (!attempt.ok) throw new Error(`purchase ${i} should succeed`);
    state = attempt.state;
    const nextCost = equipmentCost(mic, ownedCount(state, mic.id));
    assertEquals(nextCost > lastCost, true);
    lastCost = nextCost;
  }
});
