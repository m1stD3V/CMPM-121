/**
 * The studio's equipment list: one row per catalog item, showing what it
 * does, how many the studio owns, and what the next unit costs.
 *
 * Rows the studio has not unlocked yet stay hidden until its tier catches
 * up. This component only displays state and forwards purchase requests;
 * the buying rules live in `src/game/state.ts`.
 */
import {
  type Equipment,
  EQUIPMENT_CATALOG,
  equipmentCost,
} from "../game/equipment.ts";
import { tierIndexFor } from "../game/tiers.ts";
import { ownedCount, type StudioState } from "../game/state.ts";
import { el } from "./elements.ts";

export interface EquipmentListView {
  root: HTMLElement;
  /** Refresh every row so it agrees with the current state. */
  update: (state: StudioState) => void;
}

interface EquipmentRow {
  element: HTMLElement;
  ownedLabel: HTMLElement;
  costLabel: HTMLElement;
  buyButton: HTMLButtonElement;
}

/** Creates the equipment list and wires purchase requests to `onPurchase`. */
export function createEquipmentList(
  onPurchase: (equipmentId: string) => void,
): EquipmentListView {
  const rows = new Map<string, EquipmentRow>();
  const list = el("section", "equipment-list");
  list.append(el("h2", "equipment-heading", "Equipment"));

  for (const item of EQUIPMENT_CATALOG as Equipment[]) {
    const ownedLabel = el("span", "equipment-owned", "");
    const costLabel = el("span", "equipment-cost", "");
    const buyButton = el("button", "equipment-buy", "Buy");
    buyButton.addEventListener("click", () => onPurchase(item.id));

    const row = el(
      "article",
      "equipment-row",
      el(
        "header",
        "equipment-header",
        el("h3", "equipment-name", item.name, ownedLabel),
        costLabel,
      ),
      el("p", "equipment-description", item.description),
      buyButton,
    );

    rows.set(item.id, { element: row, ownedLabel, costLabel, buyButton });
    list.append(row);
  }

  return {
    root: list,
    update(state) {
      const tier = tierIndexFor(state.lifetimeEarnings);
      for (const item of EQUIPMENT_CATALOG as Equipment[]) {
        const row = rows.get(item.id)!;
        row.element.hidden = item.tier > tier;

        const count = ownedCount(state, item.id);
        const cost = equipmentCost(item, count);
        row.ownedLabel.textContent = count > 0 ? ` ×${count}` : "";
        row.costLabel.textContent = `$${cost}`;
        row.buyButton.textContent = count > 0 ? "Buy another" : "Buy";
        row.buyButton.disabled = state.money < cost;
      }
    },
  };
}
