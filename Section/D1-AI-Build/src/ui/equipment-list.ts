/**
 * The studio's equipment list: one row per catalog item, showing what it
 * does, how many the studio owns, and what the next unit costs.
 *
 * This component only displays state and forwards purchase requests; the
 * buying rules live in `src/game/state.ts`.
 */
import {
  EQUIPMENT_CATALOG,
  equipmentCost,
  ownedCount,
  type StudioState,
} from "../game/state.ts";
import { el } from "./elements.ts";

export interface EquipmentListView {
  root: HTMLElement;
  /** Refresh every row so it agrees with the current state. */
  update: (state: StudioState) => void;
}

/** Creates the equipment list and wires purchase requests to `onPurchase`. */
export function createEquipmentList(
  onPurchase: (equipmentId: string) => void,
): EquipmentListView {
  const rows = new Map<
    string,
    {
      ownedLabel: HTMLElement;
      costLabel: HTMLElement;
      buyButton: HTMLButtonElement;
    }
  >();

  const root = el("section", "equipment-list");
  root.append(el("h2", "equipment-heading", "Equipment"));

  for (const item of EQUIPMENT_CATALOG) {
    const ownedLabel = el("span", "equipment-owned", "");
    const costLabel = el("span", "equipment-cost", "");
    const buyButton = el("button", "equipment-buy", "Buy");
    buyButton.addEventListener("click", () => onPurchase(item.id));

    rows.set(item.id, { ownedLabel, costLabel, buyButton });

    root.append(
      el(
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
      ),
    );
  }

  function update(state: StudioState): void {
    for (const item of EQUIPMENT_CATALOG) {
      const row = rows.get(item.id)!;
      const count = ownedCount(state, item.id);
      const cost = equipmentCost(item, count);

      row.ownedLabel.textContent = count > 0 ? ` ×${count}` : "";
      row.costLabel.textContent = `$${cost}`;
      row.buyButton.textContent = count === 0 ? "Buy" : "Buy another";
      // A row the studio cannot afford stays visible but disabled, showing
      // what to save toward next.
      row.buyButton.disabled = state.money < cost;
    }
  }

  return { root, update };
}
