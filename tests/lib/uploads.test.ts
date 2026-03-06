import { describe, expect, it } from "vitest";
import {
  avatarMimeTypeToExtension,
  normalizeUploadPublicPath,
  validateAvatarUpload,
} from "@/lib/uploads";

describe("avatarMimeTypeToExtension", () => {
  it("returns a file extension for supported mime types", () => {
    expect(avatarMimeTypeToExtension("image/png")).toBe(".png");
    expect(avatarMimeTypeToExtension("image/jpeg")).toBe(".jpg");
    expect(avatarMimeTypeToExtension("image/webp")).toBe(".webp");
  });
});

describe("validateAvatarUpload", () => {
  it("accepts supported file metadata", () => {
    expect(() =>
      validateAvatarUpload({ size: 500_000, type: "image/png" }),
    ).not.toThrow();
  });

  it("rejects unsupported mime types", () => {
    expect(() =>
      validateAvatarUpload({ size: 512_000, type: "application/pdf" }),
    ).toThrow("Avatar uploads must be JPG, PNG, or WebP.");
  });

  it("rejects oversized avatars", () => {
    expect(() =>
      validateAvatarUpload({ size: 512_001, type: "image/png" }),
    ).toThrow("Avatar uploads must be 500 KB or smaller.");
  });
});

describe("normalizeUploadPublicPath", () => {
  it("returns safe upload paths", () => {
    expect(normalizeUploadPublicPath("/uploads/avatars/example.png")).toBe(
      "/uploads/avatars/example.png",
    );
  });

  it("rejects paths outside the avatar directory", () => {
    expect(normalizeUploadPublicPath("/uploads/other/example.png")).toBeNull();
    expect(
      normalizeUploadPublicPath("/uploads/avatars/../../secret.txt"),
    ).toBeNull();
  });
});
