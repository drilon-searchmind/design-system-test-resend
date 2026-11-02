/**
 * `<option>`-liste til kunde-vælgere: brands med koncern vises under `<optgroup label="Koncern · …">`.
 * Valget er stadig ét brand (opgaver, tid og kontrakter hører til brandet).
 *
 * @param {{ items: { value: string; label: string; group?: string | null; disabled?: boolean }[] }} props
 */
export function ClientPicklistOptions({ items }) {
  /** @type {Map<string, typeof items>} */
  const groups = new Map();
  /** @type {({ kind: "option"; item: (typeof items)[number] } | { kind: "group"; name: string })[]} */
  const order = [];

  for (const item of items) {
    const g = item.group?.trim();
    if (!g) {
      order.push({ kind: "option", item });
      continue;
    }
    const list = groups.get(g);
    if (list) list.push(item);
    else {
      groups.set(g, [item]);
      order.push({ kind: "group", name: g });
    }
  }

  return order.map((entry) =>
    entry.kind === "option" ?
      <option key={entry.item.value} value={entry.item.value} disabled={entry.item.disabled}>
        {entry.item.label}
      </option>
    : <optgroup key={`g-${entry.name}`} label={`Koncern · ${entry.name}`}>
        {(groups.get(entry.name) ?? []).map((item) => (
          <option key={item.value} value={item.value} disabled={item.disabled}>
            {item.label}
          </option>
        ))}
      </optgroup>,
  );
}
