import { describe, expect, it } from "vitest";
import { addMoney, cmpMoney, formatPeso, money, subMoney } from "../domain/money";

describe("money helpers", () => {
  it("keeps two decimal places as strings", () => {
    expect(money(500)).toBe("500.00");
    expect(addMoney("500.00", "25.50")).toBe("525.50");
    expect(subMoney("500.00", "200.00")).toBe("300.00");
    expect(cmpMoney("100.00", "99.99")).toBeGreaterThan(0);
  });

  it("uses Philippine peso formatting", () => {
    const formatted = formatPeso("1234.5");
    expect(formatted).toContain("₱");
    expect(formatted.replace(/[^\d.]/g, "")).toContain("1");
  });
});
