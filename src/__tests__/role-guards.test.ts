import { describe, expect, it } from "vitest";
import { canAccessRoute, ROUTE_POLICY } from "../auth/RequireAuth";
import type { Role } from "../domain/types";

describe("role route guards", () => {
  it("allows homeowner on dashboard, dues, payments, reports", () => {
    const roles: Role[] = ["homeowner"];
    expect(canAccessRoute(roles, ROUTE_POLICY.dashboard)).toBe(true);
    expect(canAccessRoute(roles, ROUTE_POLICY.dues)).toBe(true);
    expect(canAccessRoute(roles, ROUTE_POLICY.payments)).toBe(true);
    expect(canAccessRoute(roles, ROUTE_POLICY.reports)).toBe(true);
  });

  it("blocks homeowner from expenses, settings, audit, verify", () => {
    const roles: Role[] = ["homeowner"];
    expect(canAccessRoute(roles, ROUTE_POLICY.expenses)).toBe(false);
    expect(canAccessRoute(roles, ROUTE_POLICY.settings)).toBe(false);
    expect(canAccessRoute(roles, ROUTE_POLICY.audit)).toBe(false);
    expect(canAccessRoute(roles, ROUTE_POLICY.verifyPayment)).toBe(false);
    expect(canAccessRoute(roles, ROUTE_POLICY.lotsManage)).toBe(false);
    expect(canAccessRoute(roles, ROUTE_POLICY.attendance)).toBe(false);
  });

  it("allows officer to view lots but not manage settings/expenses", () => {
    const roles: Role[] = ["officer"];
    expect(canAccessRoute(roles, ROUTE_POLICY.lots)).toBe(true);
    expect(canAccessRoute(roles, ROUTE_POLICY.attendance)).toBe(true);
    expect(canAccessRoute(roles, ROUTE_POLICY.expenses)).toBe(false);
    expect(canAccessRoute(roles, ROUTE_POLICY.settings)).toBe(false);
  });

  it("lets only an admin open access", () => {
    expect(canAccessRoute(["homeowner"], ROUTE_POLICY.access)).toBe(false);
    expect(canAccessRoute(["officer"], ROUTE_POLICY.access)).toBe(false);
    expect(canAccessRoute(["admin"], ROUTE_POLICY.access)).toBe(true);
  });

  it("allows treasurer full money admin routes", () => {
    const roles: Role[] = ["treasurer"];
    expect(canAccessRoute(roles, ROUTE_POLICY.expenses)).toBe(true);
    expect(canAccessRoute(roles, ROUTE_POLICY.settings)).toBe(true);
    expect(canAccessRoute(roles, ROUTE_POLICY.audit)).toBe(true);
    expect(canAccessRoute(roles, ROUTE_POLICY.verifyPayment)).toBe(true);
    expect(canAccessRoute(roles, ROUTE_POLICY.lotsManage)).toBe(true);
  });
});
