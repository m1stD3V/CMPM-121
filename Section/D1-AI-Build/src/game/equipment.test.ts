import { assertEquals } from "jsr:@std/assert@1";
import {
  EQUIPMENT_CATALOG,
  equipmentCost,
  findEquipment,
  visibleEquipment,
} from "./equipment.ts";
import { STUDIO_TIERS, tierIndexFor } from "./tiers.ts";
import { initialState } from "./state.ts";

Deno.test("every catalog item has a unique id", () => {
  const ids = EQUIPMENT_CATALOG.map((item) => item.id);
  assertEquals(new Set(ids).size, ids.length);
});

Deno.test("findEquipment resolves known ids and rejects unknown ones", () => {
  for (const item of EQUIPMENT_CATALOG) {
    assertEquals(findEquipment(item.id), item);
  }
  assertEquals(findEquipment("does-not-exist"), undefined);
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

Deno.test("costs keep climbing even after many purchases", () => {
  const mic = findEquipment("usb-mic")!;
  let cost = equipmentCost(mic, 0);
  for (let count = 1; count < 100; count++) {
    const next = equipmentCost(mic, count);
    assertEquals(next > cost, true, `unit ${count}`);
    cost = next;
  }
});

Deno.test("a studio can only see gear its tier has unlocked", () => {
  const fresh = initialState();
  const atStart = visibleEquipment(fresh);
  for (const item of EQUIPMENT_CATALOG) {
    const unlocked = item.tier <= tierIndexFor(fresh.lifetimeEarnings);
    assertEquals(atStart.some((visible) => visible.id === item.id), unlocked);
  }
});

Deno.test("a top-tier studio sees the entire catalog", () => {
  const finalTier = STUDIO_TIERS[STUDIO_TIERS.length - 1];
  const reached = {
    ...initialState(),
    lifetimeEarnings: finalTier.earningsRequired,
  };
  assertEquals(visibleEquipment(reached).length, EQUIPMENT_CATALOG.length);
});

Deno.test("unlocking a new tier reveals only its own gear", () => {
  const fresh = initialState();
  const homeStudio = {
    ...fresh,
    lifetimeEarnings: STUDIO_TIERS[1].earningsRequired,
  };
  const freshIds = new Set(visibleEquipment(fresh).map((item) => item.id));
  const newlyVisible = visibleEquipment(homeStudio).filter(
    (item) => !freshIds.has(item.id),
  );
  for (const item of newlyVisible) {
    assertEquals(item.tier, 1, item.id);
  }
});
