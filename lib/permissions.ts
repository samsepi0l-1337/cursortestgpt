import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole, resolveRedirectTo } from "@/lib/auth-utils";

export async function requireSignedIn(redirectTo?: string) {
  const session = await auth();

  if (!session?.user?.id) {
    const destination = resolveRedirectTo(redirectTo, "/profile");

    redirect(`/login?redirectTo=${encodeURIComponent(destination)}`);
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      email: true,
      id: true,
      image: true,
      name: true,
      role: true,
    },
  });

  if (!currentUser) {
    redirect("/login?error=Your session is no longer valid.");
  }

  return currentUser;
}

export async function requireAdmin() {
  const currentUser = await requireSignedIn("/admin");

  if (!isAdminRole(currentUser.role)) {
    redirect("/profile?error=You do not have admin access.");
  }

  return currentUser;
}
