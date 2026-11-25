/**
 * The studio's data and the only legal ways it changes. Income rules live
 * in `economy.ts`; gear definitions live in `equipment.ts`.
 */
import { equipmentCost, findEquipment } from "./equipment.ts";
import { payoutPerTrack, royaltiesPerSecond } from "./economy.ts";

/**
 * Everything the studio owns, plus the royalties it has ever earned.
 * `lifetimeEarnings` drives progression tiers; spending money does not
 * reduce it, so levels are never lost.
 */
export interface StudioState {
  money: number;
  ownedEquipment: Record<string, number>;
  lifetimeEarnings: number;
}

export function initialState(): StudioState {
  return { money: 0, ownedEquipment: {}, lifetimeEarnings: 0 };
}

/** How many units of a given piece of equipment the studio owns. */
export function ownedCount(state: StudioState, equipmentId: string): number {
  return state.ownedEquipment[equipmentId] ?? 0;
}

/**
 * Record one track, paying out its royalty immediately.
 * Pure: returns a new state rather than mutating the one it was given.
 */
export function recordTrack(state: StudioState): StudioState {
  const payout = payoutPerTrack(state);
  return {
    ...state,
    money: state.money + payout,
    lifetimeEarnings: state.lifetimeEarnings + payout,
  };
}

/**
 * Let `seconds` of studio time pass, crediting royalties for that period.
 * Time is measured in seconds so growth depends on elapsed time, never on
 * how often the game happens to repaint.
 */
export function applyRoyalties(
  state: StudioState,
  seconds: number,
): StudioState {
  if (seconds <= 0) return state;
  const gain = royaltiesPerSecond(state) * seconds;
  return {
    ...state,
    money: state.money + gain,
    lifetimeEarnings: state.lifetimeEarnings + gain,
  };
}

/** Why a purchase did not go through. */
export type PurchaseFailure = "unknown-equipment" | "insufficient-funds";

/** The outcome of trying to buy a piece of equipment. */
export type PurchaseResult =
  | { ok: true; state: StudioState }
  | { ok: false; reason: PurchaseFailure };

/**
 * Buy one unit of equipment. Pure: returns a new state, never mutates.
 * An unaffordable or unknown purchase is rejected with no changes made.
 */
export function purchaseEquipment(
  state: StudioState,
  equipmentId: string,
): PurchaseResult {
  const equipment = findEquipment(equipmentId);
  if (!equipment) return { ok: false, reason: "unknown-equipment" };

  const count = ownedCount(state, equipmentId);
  const cost = equipmentCost(equipment, count);
  if (state.money < cost) return { ok: false, reason: "insufficient-funds" };

  return {
    ok: true,
    state: {
      ...state,
      money: state.money - cost,
      ownedEquipment: { ...state.ownedEquipment, [equipmentId]: count + 1 },
    },
  };
}
