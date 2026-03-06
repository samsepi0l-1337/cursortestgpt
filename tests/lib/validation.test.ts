import { describe, expect, it } from "vitest";
import {
  adminRoleSchema,
  profileSchema,
  registerSchema,
  signInSchema,
} from "@/lib/validation";

describe("signInSchema", () => {
  it("trims and lowercases email values before validation", () => {
    const result = signInSchema.parse({
      email: "  Person@Example.com  ",
      password: "password123",
    });

    expect(result.email).toBe("person@example.com");
  });
});

describe("registerSchema", () => {
  it("rejects mismatched passwords", () => {
    expect(() =>
      registerSchema.parse({
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "password123",
        confirmPassword: "password124",
      }),
    ).toThrow("Passwords must match.");
  });

  it("normalizes a blank name to null", () => {
    const result = registerSchema.parse({
      name: "",
      email: "ada@example.com",
      password: "password123",
      confirmPassword: "password123",
    });

    expect(result.name).toBeNull();
  });
});

describe("profileSchema", () => {
  it("normalizes optional blank values to null", () => {
    const result = profileSchema.parse({
      name: "Grace Hopper",
      bio: "",
      location: "",
      website: "",
      phone: "",
    });

    expect(result.bio).toBeNull();
    expect(result.location).toBeNull();
    expect(result.website).toBeNull();
    expect(result.phone).toBeNull();
  });
});

describe("adminRoleSchema", () => {
  it("accepts supported roles only", () => {
    const result = adminRoleSchema.parse({
      userId: "user_123",
      role: "ADMIN",
    });

    expect(result.role).toBe("ADMIN");
  });
});
