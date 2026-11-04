import { describe, expect, it } from "vitest";
import en from "../i18n/locales/en.json";
import fil from "../i18n/locales/fil.json";

function flatten(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flatten(value as Record<string, unknown>, path));
    } else {
      out[path] = String(value);
    }
  }
  return out;
}

describe("i18n locale parity", () => {
  const enFlat = flatten(en as Record<string, unknown>);
  const filFlat = flatten(fil as Record<string, unknown>);
  const enKeys = Object.keys(enFlat).sort();
  const filKeys = Object.keys(filFlat).sort();

  it("every English key exists in Filipino", () => {
    const missing = enKeys.filter((k) => !(k in filFlat));
    expect(missing).toEqual([]);
  });

  it("every Filipino key exists in English", () => {
    const missing = filKeys.filter((k) => !(k in enFlat));
    expect(missing).toEqual([]);
  });

  it("has no empty string values in either locale", () => {
    for (const [k, v] of Object.entries(enFlat)) {
      expect(v.trim().length, `en:${k}`).toBeGreaterThan(0);
    }
    for (const [k, v] of Object.entries(filFlat)) {
      expect(v.trim().length, `fil:${k}`).toBeGreaterThan(0);
    }
  });
});
