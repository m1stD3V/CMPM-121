/**
 * How the studio's numbers grow: the income rules that turn owned equipment
 * into royalties. Pure calculations, free of DOM code and state transitions.
 */
import type { StudioState } from "./state.ts";
import { EQUIPMENT_CATALOG } from "./equipment.ts";

/** Royalties paid out by a single recorded track at the start of the game. */
export const PAYOUT_PER_TRACK = 1;

/** Royalties per second that trickle in from music already released. */
export const BASE_ROYALTY_RATE = 0.1;

/** Royalties paid out by a single recorded track, including owned gear. */
export function payoutPerTrack(state: StudioState): number {
  let payout = PAYOUT_PER_TRACK;
  for (const item of EQUIPMENT_CATALOG) {
    payout += (state.ownedEquipment[item.id] ?? 0) * item.payoutBonus;
  }
  return payout;
}

/** Royalties earned per second, including owned gear. */
export function royaltiesPerSecond(state: StudioState): number {
  let rate = BASE_ROYALTY_RATE;
  for (const item of EQUIPMENT_CATALOG) {
    rate += (state.ownedEquipment[item.id] ?? 0) * item.royaltyRate;
  }
  return rate;
}
