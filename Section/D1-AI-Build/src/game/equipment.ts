/**
 * The studio's equipment catalog: pure content data plus each item's cost
 * curve. Rules about money and state transitions live elsewhere; adding a
 * new piece of gear here requires no changes to any other module.
 */
import type { StudioState } from "./state.ts";
import { tierIndexFor } from "./tiers.ts";

/** A piece of studio equipment the player can buy, and what it contributes. */
export interface Equipment {
  /** Stable identifier used in state and tests. */
  id: string;
  /** Name shown in the studio's equipment list. */
  name: string;
  /** One-line flavor text explaining what the gear does for the studio. */
  description: string;
  /** Studio tier required before this item appears in the list. */
  tier: number;
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
    tier: 0,
    baseCost: 15,
    costGrowth: 1.15,
    royaltyRate: 0,
    payoutBonus: 1,
  },
  {
    id: "audio-interface",
    name: "Audio Interface",
    description: "Cleaner preamps mean every take earns a little more.",
    tier: 0,
    baseCost: 100,
    costGrowth: 1.15,
    royaltyRate: 0,
    payoutBonus: 4,
  },
  {
    id: "monitor-speakers",
    name: "Monitor Speakers",
    description: "Hear the mix properly and stop shipping muddy masters.",
    tier: 1,
    baseCost: 250,
    costGrowth: 1.15,
    royaltyRate: 0,
    payoutBonus: 12,
  },
  {
    id: "midi-keyboard",
    name: "MIDI Keyboard",
    description: "Sketch melodies anywhere; the royalties keep flowing.",
    tier: 1,
    baseCost: 400,
    costGrowth: 1.15,
    royaltyRate: 1,
    payoutBonus: 0,
  },
  {
    id: "vocal-booth",
    name: "Vocal Booth",
    description: "Dead-quiet recordings release faster and stream longer.",
    tier: 2,
    baseCost: 1200,
    costGrowth: 1.15,
    royaltyRate: 4,
    payoutBonus: 0,
  },
  {
    id: "vintage-compressor",
    name: "Vintage Compressor",
    description: "The glue on every hit record. Expensive, worth it.",
    tier: 3,
    baseCost: 3500,
    costGrowth: 1.15,
    royaltyRate: 12,
    payoutBonus: 0,
  },
];

/** Look up a catalog item by its stable id, or undefined if unknown. */
export function findEquipment(equipmentId: string): Equipment | undefined {
  return EQUIPMENT_CATALOG.find((item) => item.id === equipmentId);
}

/** Catalog items the studio has unlocked at its current tier. */
export function visibleEquipment(state: StudioState): Equipment[] {
  const tier = tierIndexFor(state.lifetimeEarnings);
  return EQUIPMENT_CATALOG.filter((item) => item.tier <= tier);
}

/** Price of the next unit of an item, growing with each one owned. */
export function equipmentCost(equipment: Equipment, count: number): number {
  return Math.ceil(equipment.baseCost * equipment.costGrowth ** count);
}
