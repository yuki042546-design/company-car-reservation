import { afterEach, describe, expect, it } from "vitest";
import { isAllowedEmailDomain, roleAtLeast } from "./auth";

describe("roleAtLeast", () => {
  it("employee does not satisfy vehicle_manager", () => {
    expect(roleAtLeast("employee", "vehicle_manager")).toBe(false);
  });
  it("vehicle_manager satisfies vehicle_manager", () => {
    expect(roleAtLeast("vehicle_manager", "vehicle_manager")).toBe(true);
  });
  it("system_admin satisfies vehicle_manager (higher role includes lower privileges)", () => {
    expect(roleAtLeast("system_admin", "vehicle_manager")).toBe(true);
  });
  it("vehicle_manager does not satisfy system_admin", () => {
    expect(roleAtLeast("vehicle_manager", "system_admin")).toBe(false);
  });
  it("employee satisfies employee", () => {
    expect(roleAtLeast("employee", "employee")).toBe(true);
  });
});

describe("isAllowedEmailDomain", () => {
  const original = process.env.ALLOWED_EMAIL_DOMAINS;

  afterEach(() => {
    process.env.ALLOWED_EMAIL_DOMAINS = original;
  });

  it("fails closed (rejects everything) when ALLOWED_EMAIL_DOMAINS is unset", () => {
    delete process.env.ALLOWED_EMAIL_DOMAINS;
    expect(isAllowedEmailDomain("someone@example.co.jp")).toBe(false);
  });

  it("accepts an email whose domain is in the allow-list", () => {
    process.env.ALLOWED_EMAIL_DOMAINS = "example.co.jp,partner.co.jp";
    expect(isAllowedEmailDomain("someone@example.co.jp")).toBe(true);
  });

  it("rejects an email whose domain is not in the allow-list", () => {
    process.env.ALLOWED_EMAIL_DOMAINS = "example.co.jp";
    expect(isAllowedEmailDomain("someone@not-allowed.com")).toBe(false);
  });

  it("is case-insensitive on the domain", () => {
    process.env.ALLOWED_EMAIL_DOMAINS = "Example.co.jp";
    expect(isAllowedEmailDomain("someone@EXAMPLE.CO.JP")).toBe(true);
  });
});
