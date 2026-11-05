/**
 * Studio Clicker's core numbers, kept free of DOM code so tests can exercise
 * the rules without a browser.
 *
 * The studio's only resource is money. Recording a track pays out royalties;
 * everything else in the game (equipment, staff, record deals) is built on
 * top of that flow.
 */

/**
 * Money the studio has on hand, ready to spend, plus how many units of each
 * piece of equipment the studio owns.
 */
export interface StudioState {
  money: number;
  ownedEquipment: Record<string, number>;
}

/** Royalties paid out by a single recorded track at the start of the game. */
export const PAYOUT_PER_TRACK = 1;

/** Royalties per second that trickle in from music already released. */
export const BASE_ROYALTY_RATE = 0.1;

export function initialState(): StudioState {
  return { money: 0, ownedEquipment: {} };
}

/**
 * Record one track, paying out its royalty immediately.
 * Pure: returns a new state rather than mutating the one it was given.
 */
export function recordTrack(state: StudioState): StudioState {
  return { ...state, money: state.money + PAYOUT_PER_TRACK };
}

/**
 * Royalties earned per second. Grows as the studio acquires equipment and
 * talent; for now the only income is the baseline drip from released music.
 */
export function applyRoyalties(
  state: StudioState,
  seconds: number,
): StudioState {
  if (seconds <= 0) return state;
  const gain = royaltiesPerSecond(state) * seconds;
  return { ...state, money: state.money + gain };
}

/** A piece of studio equipment the player can buy, and what it contributes. */
export interface Equipment {
  /** Stable identifier used in state and tests. */
  id: string;
  /** Name shown in the studio's equipment list. */
  name: string;
  /** One-line flavor text explaining what the gear does for the studio. */
  description: string;
  /** Price of the first unit. */
  baseCost: number;
  /** How much the price multiplies per unit already owned. */
  costGrowth: number;
  /** Extra royalties per second each unit earns. */
  royaltyRate: number;
  /** Extra royalties per recorded track each unit earns. */
  payoutBonus: number;
}

/** The gear the studio can buy, from bedroom basics to pro hardware. */
export const EQUIPMENT_CATALOG: Equipment[] = [
  {
    id: "usb-mic",
    name: "USB Microphone",
    description: "A starter mic that captures vocals without the noise floor.",
    baseCost: 15,
    costGrowth: 1.15,
    royaltyRate: 0,
    payoutBonus: 1,
  },
  {
    id: "audio-interface",
    name: "Audio Interface",
    description: "Cleaner preamps mean every take earns a little more.",
    baseCost: 100,
    costGrowth: 1.15,
    royaltyRate: 0,
    payoutBonus: 4,
  },
  {
    id: "monitor-speakers",
    name: "Monitor Speakers",
    description: "Hear the mix properly and stop shipping muddy masters.",
    baseCost: 250,
    costGrowth: 1.15,
    royaltyRate: 0,
    payoutBonus: 12,
  },
  {
    id: "midi-keyboard",
    name: "MIDI Keyboard",
    description: "Sketch melodies anywhere; the royalties keep flowing.",
    baseCost: 400,
    costGrowth: 1.15,
    royaltyRate: 1,
    payoutBonus: 0,
  },
  {
    id: "vocal-booth",
    name: "Vocal Booth",
    description: "Dead-quiet recordings release faster and stream longer.",
    baseCost: 1200,
    costGrowth: 1.15,
    royaltyRate: 4,
    payoutBonus: 0,
  },
  {
    id: "vintage-compressor",
    name: "Vintage Compressor",
    description: "The glue on every hit record. Expensive, worth it.",
    baseCost: 3500,
    costGrowth: 1.15,
    royaltyRate: 12,
    payoutBonus: 0,
  },
];

/** How many units of a given piece of equipment the studio owns. */
export function ownedCount(state: StudioState, equipmentId: string): number {
  return state.ownedEquipment[equipmentId] ?? 0;
}

/** Price of the next unit of an item, growing with each one owned. */
export function equipmentCost(equipment: Equipment, count: number): number {
  return Math.ceil(equipment.baseCost * equipment.costGrowth ** count);
}

/** Royalties paid out by a single recorded track, including owned gear. */
export function payoutPerTrack(state: StudioState): number {
  let payout = PAYOUT_PER_TRACK;
  for (const item of EQUIPMENT_CATALOG) {
    payout += ownedCount(state, item.id) * item.payoutBonus;
  }
  return payout;
}

/** Royalties earned per second, including owned gear. */
export function royaltiesPerSecond(state: StudioState): number {
  let rate = BASE_ROYALTY_RATE;
  for (const item of EQUIPMENT_CATALOG) {
    rate += ownedCount(state, item.id) * item.royaltyRate;
  }
  return rate;
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
  const equipment = EQUIPMENT_CATALOG.find((item) => item.id === equipmentId);
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
