import { assertEquals } from "jsr:@std/assert@1";
import {
  BASE_ROYALTY_RATE,
  PAYOUT_PER_TRACK,
  payoutPerTrack,
  royaltiesPerSecond,
} from "./economy.ts";
import { initialState, purchaseEquipment } from "./state.ts";

Deno.test("an empty studio earns the baseline rates", () => {
  const state = initialState();
  assertEquals(payoutPerTrack(state), PAYOUT_PER_TRACK);
  assertEquals(royaltiesPerSecond(state), BASE_ROYALTY_RATE);
});

Deno.test("buying a payout item raises the per-track payout only", () => {
  const purchase = purchaseEquipment(
    { ...initialState(), money: 100 },
    "usb-mic",
  );
  if (!purchase.ok) throw new Error("purchase should succeed");

  assertEquals(payoutPerTrack(purchase.state), PAYOUT_PER_TRACK + 1);
  assertEquals(royaltiesPerSecond(purchase.state), BASE_ROYALTY_RATE);
});

Deno.test("buying a royalty item raises the per-second rate only", () => {
  const state = { ...initialState(), money: 1000 };
  const purchase = purchaseEquipment(state, "midi-keyboard");
  if (!purchase.ok) throw new Error("purchase should succeed");

  assertEquals(royaltiesPerSecond(purchase.state), BASE_ROYALTY_RATE + 1);
  assertEquals(payoutPerTrack(purchase.state), PAYOUT_PER_TRACK);
});

Deno.test("owned units stack their effects", () => {
  let state = { ...initialState(), money: 10_000 };
  for (let i = 0; i < 3; i++) {
    const purchase = purchaseEquipment(state, "usb-mic");
    if (!purchase.ok) throw new Error(`purchase ${i} should succeed`);
    state = purchase.state;
  }
  assertEquals(payoutPerTrack(state), PAYOUT_PER_TRACK + 3);
});

Deno.test("rates depend only on ownership, not on the money on hand", () => {
  const broke = { ...initialState(), money: 0 };
  const rich = { ...initialState(), money: 1_000_000 };
  assertEquals(royaltiesPerSecond(broke), royaltiesPerSecond(rich));
  assertEquals(payoutPerTrack(broke), payoutPerTrack(rich));
});
