import { describe, expect, it } from "vitest";
import { isAdminRole, resolveRedirectTo } from "@/lib/auth-utils";

describe("isAdminRole", () => {
  it("returns true for admin users", () => {
    expect(isAdminRole("ADMIN")).toBe(true);
  });

  it("returns false for all non-admin values", () => {
    expect(isAdminRole("USER")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });
});

describe("resolveRedirectTo", () => {
  it("accepts local app paths", () => {
    expect(resolveRedirectTo("/admin", "/profile")).toBe("/admin");
  });

  it("falls back when the path is missing or unsafe", () => {
    expect(resolveRedirectTo(null, "/profile")).toBe("/profile");
    expect(resolveRedirectTo("https://example.com", "/profile")).toBe(
      "/profile",
    );
    expect(resolveRedirectTo("//malicious.test", "/profile")).toBe("/profile");
  });
});
