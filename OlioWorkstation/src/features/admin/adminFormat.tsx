import type { AdminField, AdminFieldType } from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T|$)/;

export function humanizeAdminText(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function adminFieldLabel(field: AdminField) {
  if (field.name === "id") return "Record ID";
  if (field.name.endsWith("_id")) return field.label.replace(/\s+ID$/i, "") || humanizeAdminText(field.name.slice(0, -3));
  return field.label;
}

export function formatAdminValue(value: unknown, type?: AdminFieldType, fieldName?: string): string {
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return new Intl.NumberFormat().format(value);
  if (Array.isArray(value)) return value.length ? value.map((item) => formatAdminValue(item)).join(", ") : "None";
  if (typeof value === "object") return "Structured details";

  const text = String(value);
  if (type === "datetime" || (!type && ISO_DATE.test(text) && text.includes("T"))) {
    const date = new Date(text);
    return Number.isNaN(date.valueOf())
      ? text
      : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
  }
  if (type === "date" || (!type && /^\d{4}-\d{2}-\d{2}$/.test(text))) {
    const date = new Date(`${text.slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.valueOf())
      ? text
      : new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(date);
  }
  if (type === "time" && /^\d{2}:\d{2}/.test(text)) {
    const [hours, minutes] = text.split(":").map(Number);
    const date = new Date(2000, 0, 1, hours, minutes);
    return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(date);
  }
  if (type === "select" || fieldName === "status" || fieldName === "action" || fieldName === "resource") {
    return humanizeAdminText(text);
  }
  return text;
}

export function AdminDisplayValue({ value, field }: { value: unknown; field?: AdminField }) {
  if (value === null || value === undefined || value === "") return <span className="text-slate-500">Not set</span>;
  if (typeof value === "boolean") {
    return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${value ? "bg-emerald-400/10 text-emerald-200" : "bg-slate-400/10 text-slate-400"}`}>{value ? "Yes" : "No"}</span>;
  }
  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-slate-500">None</span>;
    return <div className="flex flex-wrap gap-1.5">{value.map((item, index) => <span key={index} className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-300">{formatAdminValue(item)}</span>)}</div>;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length) return <span className="text-slate-500">No details</span>;
    return <dl className="grid gap-2">{entries.map(([key, item]) => (
      <div key={key} className="grid gap-1 rounded-lg bg-black/15 px-3 py-2 sm:grid-cols-[9rem_1fr]">
        <dt className="text-xs font-medium text-slate-500">{humanizeAdminText(key)}</dt>
        <dd className="min-w-0 break-words text-sm text-slate-200"><AdminDisplayValue value={item} /></dd>
      </div>
    ))}</dl>;
  }

  const text = String(value);
  const formatted = formatAdminValue(value, field?.type, field?.name);
  if (field?.name.includes("email") && text.includes("@")) return <a className="text-blue-200 hover:underline" href={`mailto:${text}`}>{text}</a>;
  if (field?.name.includes("url") && /^https?:\/\//i.test(text)) return <a className="break-all text-blue-200 hover:underline" href={text} target="_blank" rel="noreferrer">{text}</a>;
  return <span className={field?.type === "textarea" ? "whitespace-pre-wrap leading-6" : ""}>{formatted}</span>;
}
