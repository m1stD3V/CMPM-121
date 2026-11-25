/**
 * Minimal DOM helper so the UI code reads as structure rather than a wall of
 * `document.createElement` calls.
 *
 * The game's rules live in `src/game/`; this module is only about building
 * elements, so it stays free of game logic.
 */

type Child = string | HTMLElement;

/**
 * Create an element with a class name and children.
 * Strings become text nodes; elements are appended as-is.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const child of children) {
    node.append(child);
  }
  return node;
}
