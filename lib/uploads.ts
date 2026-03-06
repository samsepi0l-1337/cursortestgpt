import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const AVATAR_DIRECTORY = path.join(
  process.cwd(),
  "public",
  "uploads",
  "avatars",
);
const AVATAR_PUBLIC_PREFIX = "/uploads/avatars/";
const AVATAR_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const MAX_AVATAR_FILE_SIZE = 512_000;

export function avatarMimeTypeToExtension(type: string) {
  return AVATAR_EXTENSION_MAP[type] ?? null;
}

export function validateAvatarUpload(file: Pick<File, "size" | "type">) {
  if (!avatarMimeTypeToExtension(file.type)) {
    throw new Error("Avatar uploads must be JPG, PNG, or WebP.");
  }

  if (file.size > MAX_AVATAR_FILE_SIZE) {
    throw new Error("Avatar uploads must be 500 KB or smaller.");
  }
}

export function normalizeUploadPublicPath(value: string | null | undefined) {
  if (
    !value ||
    !value.startsWith(AVATAR_PUBLIC_PREFIX) ||
    value.includes("..")
  ) {
    return null;
  }

  return value;
}

export async function saveAvatarUpload(file: File) {
  validateAvatarUpload(file);

  const extension = avatarMimeTypeToExtension(file.type);

  if (!extension) {
    throw new Error("Avatar uploads must be JPG, PNG, or WebP.");
  }

  const filename = `${randomUUID()}${extension}`;
  const publicPath = `${AVATAR_PUBLIC_PREFIX}${filename}`;
  const outputPath = path.join(process.cwd(), "public", publicPath);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  await mkdir(AVATAR_DIRECTORY, { recursive: true });
  await writeFile(outputPath, fileBuffer);

  return publicPath;
}

export async function deleteLocalAvatar(value: string | null | undefined) {
  const publicPath = normalizeUploadPublicPath(value);

  if (!publicPath) {
    return;
  }

  const outputPath = path.join(process.cwd(), "public", publicPath);

  if (!outputPath.startsWith(AVATAR_DIRECTORY)) {
    return;
  }

  await rm(outputPath, { force: true });
}
