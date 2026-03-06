"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { deleteLocalAvatar } from "@/lib/uploads";
import { adminRoleSchema } from "@/lib/validation";

function buildAdminUrl(kind: "error" | "message", value: string) {
  const params = new URLSearchParams();
  params.set(kind, value);
  return `/admin?${params.toString()}`;
}

export async function updateUserRoleAction(formData: FormData) {
  const currentAdmin = await requireAdmin();

  const parsedRoleUpdate = adminRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  if (!parsedRoleUpdate.success) {
    redirect(
      buildAdminUrl(
        "error",
        parsedRoleUpdate.error.issues[0]?.message ??
          "Unable to update the role.",
      ),
    );
  }

  if (parsedRoleUpdate.data.userId === currentAdmin.id) {
    redirect(
      buildAdminUrl(
        "error",
        "Use another admin account to change your own role.",
      ),
    );
  }

  try {
    await prisma.$transaction(
      async (transaction) => {
        const existingUser = await transaction.user.findUnique({
          where: {
            id: parsedRoleUpdate.data.userId,
          },
          select: {
            id: true,
            role: true,
          },
        });

        if (!existingUser) {
          redirect(buildAdminUrl("error", "That user no longer exists."));
        }

        if (
          existingUser.role === "ADMIN" &&
          parsedRoleUpdate.data.role !== "ADMIN"
        ) {
          const adminCount = await transaction.user.count({
            where: {
              role: "ADMIN",
            },
          });

          if (adminCount <= 1) {
            redirect(
              buildAdminUrl(
                "error",
                "Keep at least one admin account available.",
              ),
            );
          }
        }

        await transaction.user.update({
          where: {
            id: parsedRoleUpdate.data.userId,
          },
          data: {
            role: parsedRoleUpdate.data.role,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (caughtError) {
    if (
      caughtError instanceof Prisma.PrismaClientKnownRequestError &&
      caughtError.code === "P2034"
    ) {
      redirect(buildAdminUrl("error", "Please retry the role update."));
    }

    throw caughtError;
  }

  revalidatePath("/admin");
  redirect(buildAdminUrl("message", "User role updated."));
}

export async function deleteUserAction(formData: FormData) {
  const currentAdmin = await requireAdmin();
  const userId = formData.get("userId");

  if (typeof userId !== "string" || userId.length === 0) {
    redirect(buildAdminUrl("error", "A user id is required."));
  }

  if (userId === currentAdmin.id) {
    redirect(
      buildAdminUrl(
        "error",
        "You cannot delete your own account from the admin table.",
      ),
    );
  }

  let deletedImage: string | null = null;

  try {
    await prisma.$transaction(
      async (transaction) => {
        const existingUser = await transaction.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            id: true,
            image: true,
            role: true,
          },
        });

        if (!existingUser) {
          redirect(buildAdminUrl("error", "That user no longer exists."));
        }

        if (existingUser.role === "ADMIN") {
          const adminCount = await transaction.user.count({
            where: {
              role: "ADMIN",
            },
          });

          if (adminCount <= 1) {
            redirect(
              buildAdminUrl(
                "error",
                "Keep at least one admin account available.",
              ),
            );
          }
        }

        deletedImage = existingUser.image;

        await transaction.user.delete({
          where: {
            id: userId,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (caughtError) {
    if (
      caughtError instanceof Prisma.PrismaClientKnownRequestError &&
      caughtError.code === "P2034"
    ) {
      redirect(buildAdminUrl("error", "Please retry the delete request."));
    }

    throw caughtError;
  }

  if (deletedImage) {
    await deleteLocalAvatar(deletedImage).catch(() => undefined);
  }

  revalidatePath("/admin");
  redirect(buildAdminUrl("message", "User deleted."));
}
