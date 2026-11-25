const cards = [...document.querySelectorAll(".card")];
const query = document.querySelector("#q");
const chips = document.querySelector("#chips");
const empty = document.querySelector("#empty");
const active = new Set();

// One chip per distinct stack entry, in the order the cards present them.
const stacks = [];
for (const card of cards) {
  for (const name of (card.dataset.stack ?? "").split("|").filter(Boolean)) {
    if (!stacks.includes(name)) stacks.push(name);
  }
}

for (const name of stacks) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.textContent = name;
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => {
    if (active.has(name)) active.delete(name);
    else active.add(name);
    button.setAttribute("aria-pressed", String(active.has(name)));
    apply();
  });
  chips.append(button);
}

function apply() {
  const needle = (query.value ?? "").trim().toLowerCase();
  let shown = 0;
  for (const card of cards) {
    const text = card.textContent.toLowerCase();
    const cardStacks = (card.dataset.stack ?? "").split("|").filter(Boolean);
    const textOk = !needle || text.includes(needle);
    const stackOk = active.size === 0 || cardStacks.some((s) => active.has(s));
    const visible = textOk && stackOk;
    card.hidden = !visible;
    if (visible) shown++;
  }
  // Hide a group heading when every card under it is filtered out.
  for (const group of document.querySelectorAll(".group")) {
    const cardsInGroup = group.querySelectorAll(".card");
    const anyVisible = [...cardsInGroup].some((c) => !c.hidden);
    group.hidden = cardsInGroup.length > 0 && !anyVisible;
  }
  empty.hidden = shown > 0;
}

query.addEventListener("input", apply);

// Theme: follow the system until the reader chooses, then remember the choice.
const saved = localStorage.getItem("theme");
if (saved === "light" || saved === "dark") {
  document.documentElement.dataset.theme = saved;
}

document.querySelector("#theme").addEventListener("click", () => {
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const current = document.documentElement.dataset.theme ??
    (dark ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("theme", next);
});
