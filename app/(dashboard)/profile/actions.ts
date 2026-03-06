"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSignedIn } from "@/lib/permissions";
import { deleteLocalAvatar, saveAvatarUpload } from "@/lib/uploads";
import { profileSchema } from "@/lib/validation";

function buildProfileUrl(kind: "error" | "message", value: string) {
  const params = new URLSearchParams();
  params.set(kind, value);
  return `/profile?${params.toString()}`;
}

function getProfileFields(input: {
  bio: string | null;
  location: string | null;
  website: string | null;
  phone: string | null;
}) {
  return {
    bio: input.bio,
    location: input.location,
    website: input.website,
    phone: input.phone,
  };
}

export async function saveProfileAction(formData: FormData) {
  const signedInUser = await requireSignedIn("/profile");

  const currentUser = await prisma.user.findUnique({
    where: {
      id: signedInUser.id,
    },
    include: {
      profile: true,
    },
  });

  if (!currentUser) {
    redirect("/login?error=Your account could not be found.");
  }

  const parsedProfile = profileSchema.safeParse({
    name: formData.get("name"),
    bio: formData.get("bio"),
    location: formData.get("location"),
    website: formData.get("website"),
    phone: formData.get("phone"),
  });

  if (!parsedProfile.success) {
    redirect(
      buildProfileUrl(
        "error",
        parsedProfile.error.issues[0]?.message ?? "Unable to save the profile.",
      ),
    );
  }

  const profileFields = getProfileFields(parsedProfile.data);
  const hasProfileFields = Object.values(profileFields).some(
    (value) => value !== null,
  );

  let nextImage = currentUser.image;
  let uploadedImage: string | null = null;
  const avatarInput = formData.get("avatar");

  if (avatarInput instanceof File && avatarInput.size > 0) {
    try {
      uploadedImage = await saveAvatarUpload(avatarInput);
      nextImage = uploadedImage;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ?
          caughtError.message
        : "Unable to save the uploaded avatar.";
      redirect(buildProfileUrl("error", message));
    }
  }

  try {
    await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        name: parsedProfile.data.name,
        image: nextImage,
        ...(hasProfileFields ?
          {
            profile: {
              upsert: {
                create: profileFields,
                update: profileFields,
              },
            },
          }
        : currentUser.profile ?
          {
            profile: {
              delete: true,
            },
          }
        : {}),
      },
    });
  } catch (caughtError) {
    if (uploadedImage) {
      await deleteLocalAvatar(uploadedImage).catch(() => undefined);
    }

    throw caughtError;
  }

  if (
    uploadedImage &&
    currentUser.image &&
    currentUser.image !== uploadedImage
  ) {
    await deleteLocalAvatar(currentUser.image).catch(() => undefined);
  }

  revalidatePath("/profile");
  revalidatePath("/admin");
  redirect(buildProfileUrl("message", "Profile saved."));
}

export async function removeAvatarAction() {
  const signedInUser = await requireSignedIn("/profile");

  const currentUser = await prisma.user.findUnique({
    where: {
      id: signedInUser.id,
    },
  });

  if (!currentUser) {
    redirect("/login?error=Your account could not be found.");
  }

  await prisma.user.update({
    where: {
      id: currentUser.id,
    },
    data: {
      image: null,
    },
  });

  await deleteLocalAvatar(currentUser.image).catch(() => undefined);

  revalidatePath("/profile");
  revalidatePath("/admin");
  redirect(buildProfileUrl("message", "Avatar removed."));
}

export async function deleteProfileAction() {
  const signedInUser = await requireSignedIn("/profile");

  const currentUser = await prisma.user.findUnique({
    where: {
      id: signedInUser.id,
    },
    include: {
      profile: true,
    },
  });

  if (!currentUser) {
    redirect("/login?error=Your account could not be found.");
  }

  await prisma.user.update({
    where: {
      id: currentUser.id,
    },
    data: {
      name: null,
      image: null,
      ...(currentUser.profile ?
        {
          profile: {
            delete: true,
          },
        }
      : {}),
    },
  });

  await deleteLocalAvatar(currentUser.image).catch(() => undefined);

  revalidatePath("/profile");
  revalidatePath("/admin");
  redirect(buildProfileUrl("message", "Profile cleared."));
}
