"use client";

import { PulseIconChevronDown } from "@/components/pulse/pulse-icons";
import { cn } from "@/lib/utils";

import { ColorTokenField } from "./color-token-field";

const inputClass = cn(
  "h-10 w-full rounded-lg border border-border bg-surface-muted px-3",
  "font-sans text-[13px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
);

const textareaClass = cn(
  "min-h-[88px] w-full resize-y rounded-lg border border-border bg-surface-muted px-3 py-2",
  "font-sans text-[13px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
);

/**
 * @param {{
 *   fields: import('@/lib/crm/admin-resource-meta').AdminFieldDef[];
 *   values: Record<string, unknown>;
 *   onChange: (name: string, value: unknown) => void;
 *   relationOptions: Record<string, { _id: string; label: string }[]>;
 *   formResetKey?: string;
 * }} props
 */
export function AdminFormFields({ fields, values, onChange, relationOptions, formResetKey = "new" }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const id = `admin-field-${field.name}`;
        const value = values[field.name];

        if (field.type === "boolean") {
          return (
            <label key={field.name} className="flex items-center gap-2 sm:col-span-2">
              <input
                id={id}
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => onChange(field.name, e.target.checked)}
                className="size-4 rounded border-border text-agency-brand focus-visible:ring-agency-brand"
              />
              <span className="font-sans text-[13px] text-fg">{field.label}</span>
            </label>
          );
        }

        if (field.type === "textarea") {
          return (
            <label key={field.name} className="flex flex-col gap-1.5 sm:col-span-2">
              <FieldLabel field={field} />
              <textarea
                id={id}
                value={String(value ?? "")}
                placeholder={field.placeholder}
                onChange={(e) => onChange(field.name, e.target.value)}
                className={textareaClass}
              />
            </label>
          );
        }

        if (field.type === "select") {
          return (
            <label key={field.name} className="flex flex-col gap-1.5">
              <FieldLabel field={field} />
              <div className="relative">
                <select
                  id={id}
                  value={String(value ?? "")}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  className={cn(inputClass, "appearance-none pr-9")}
                >
                  {(field.options ?? []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-quiet">
                  <PulseIconChevronDown size={12} />
                </span>
              </div>
            </label>
          );
        }

        if (field.type === "relation") {
          const options = relationOptions[field.relation ?? ""] ?? [];
          return (
            <label key={field.name} className="flex flex-col gap-1.5">
              <FieldLabel field={field} />
              <div className="relative">
                <select
                  id={id}
                  value={String(value ?? "")}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  className={cn(inputClass, "appearance-none pr-9")}
                >
                  <option value="">— Vælg —</option>
                  {options.map((opt) => (
                    <option key={opt._id} value={opt._id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-quiet">
                  <PulseIconChevronDown size={12} />
                </span>
              </div>
            </label>
          );
        }

        if (field.type === "colorToken") {
          return (
            <ColorTokenField
              key={`${formResetKey}-${field.name}`}
              id={id}
              label={field.label}
              value={value}
              hint={field.hint}
              onChange={(v) => onChange(field.name, v)}
            />
          );
        }

        if (field.type === "multiRelation") {
          const options = relationOptions[field.relation ?? ""] ?? [];
          const selected = Array.isArray(value) ? value.map(String) : [];
          return (
            <label key={field.name} className="flex flex-col gap-1.5 sm:col-span-2">
              <FieldLabel field={field} />
              <select
                id={id}
                multiple
                value={selected}
                onChange={(e) => {
                  const next = Array.from(e.target.selectedOptions).map((o) => o.value);
                  onChange(field.name, next);
                }}
                className={cn(
                  "min-h-[120px] w-full rounded-lg border border-border bg-surface-muted px-2 py-2",
                  "font-sans text-[13px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
                )}
              >
                {options.map((opt) => (
                  <option key={opt._id} value={opt._id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {field.hint ? <span className="font-sans text-[11px] text-fg-quiet">{field.hint}</span> : null}
            </label>
          );
        }

        return (
          <label
            key={field.name}
            className={cn(
              "flex flex-col gap-1.5",
              field.type === "tags" || field.name === "bodyMd" ? "sm:col-span-2" : "",
            )}
          >
            <FieldLabel field={field} />
            <input
              id={id}
              type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
              value={String(value ?? "")}
              placeholder={field.placeholder}
              onChange={(e) => onChange(field.name, e.target.value)}
              className={inputClass}
            />
            {field.hint ? <span className="font-sans text-[11px] text-fg-quiet">{field.hint}</span> : null}
          </label>
        );
      })}
    </div>
  );
}

/** @param {{ field: import('@/lib/crm/admin-resource-meta').AdminFieldDef }} props */
function FieldLabel({ field }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">
      {field.label}
      {field.required ? <span className="text-agency-brand"> *</span> : null}
    </span>
  );
}
