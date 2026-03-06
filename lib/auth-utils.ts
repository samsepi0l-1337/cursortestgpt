export function isAdminRole(role: string | null | undefined): role is "ADMIN" {
  return role === "ADMIN";
}

export function resolveRedirectTo(
  value: FormDataEntryValue | string | null | undefined,
  fallback: string,
) {
  if (typeof value !== "string") {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
