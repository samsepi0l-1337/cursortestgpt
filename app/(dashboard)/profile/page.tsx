import Image from "next/image";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSignedIn } from "@/lib/permissions";
import {
  deleteProfileAction,
  removeAvatarAction,
  saveProfileAction,
} from "@/app/(dashboard)/profile/actions";

type ProfilePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(value);
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  const message = getSingleValue(params.message);
  const error = getSingleValue(params.error);
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

  const initials =
    currentUser.name?.trim().charAt(0) || currentUser.email?.charAt(0) || "U";

  return (
    <div className="stack">
      <section className="masthead">
        <span className="eyebrow">Profile Workspace</span>
        <h1 className="display-title">Shape your operator profile.</h1>
        <p className="lead">
          Update your account identity, refine the public profile fields, and
          manage a local avatar upload without leaving the authenticated
          dashboard.
        </p>
        {error ?
          <div
            className="status-banner"
            data-tone="error"
          >
            {error}
          </div>
        : null}
        {message ?
          <div
            className="status-banner"
            data-tone="success"
          >
            {message}
          </div>
        : null}
      </section>

      <div className="page-grid">
        <section className="panel">
          <div className="panel-inner stack">
            <div className="split-header">
              <div>
                <h2 className="card-title">Profile details</h2>
                <p className="card-copy">
                  This form upserts the related `Profile` record and keeps your
                  `User` name and avatar in sync.
                </p>
              </div>
            </div>

            <form
              action={saveProfileAction}
              className="form-grid"
              encType="multipart/form-data"
            >
              <div className="field">
                <label htmlFor="name">Display name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={currentUser.name ?? ""}
                />
              </div>

              <div className="field">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  defaultValue={currentUser.profile?.bio ?? ""}
                />
              </div>

              <div className="field">
                <label htmlFor="location">Location</label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  defaultValue={currentUser.profile?.location ?? ""}
                />
              </div>

              <div className="field">
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  type="url"
                  placeholder="https://example.com"
                  defaultValue={currentUser.profile?.website ?? ""}
                />
              </div>

              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  defaultValue={currentUser.profile?.phone ?? ""}
                />
              </div>

              <div className="field">
                <label htmlFor="avatar">Avatar</label>
                <input
                  id="avatar"
                  name="avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                />
                <p className="helper-text">
                  Upload a JPG, PNG, or WebP file up to 500 KB.
                </p>
              </div>

              <div className="form-actions">
                <button
                  className="button"
                  type="submit"
                >
                  Save profile
                </button>
              </div>
            </form>

            {currentUser.image ?
              <form
                action={removeAvatarAction}
                className="form-actions"
              >
                <button
                  className="button secondary"
                  type="submit"
                >
                  Remove avatar
                </button>
              </form>
            : null}

            <div className="stack">
              <div>
                <h3 className="card-heading">Clear profile data</h3>
                <p className="card-copy">
                  This removes the profile record, clears the display name, and
                  deletes the local avatar file if one exists.
                </p>
              </div>
              <form
                action={deleteProfileAction}
                className="form-actions"
              >
                <button
                  className="button danger"
                  type="submit"
                >
                  Delete profile data
                </button>
              </form>
            </div>
          </div>
        </section>

        <aside className="stack">
          <section className="panel">
            <div className="panel-inner stack">
              <div className="avatar-frame">
                <div className="avatar-circle">
                  {currentUser.image ?
                    <Image
                      src={currentUser.image}
                      alt="Current avatar"
                      width={88}
                      height={88}
                    />
                  : <span>{initials.toUpperCase()}</span>}
                </div>
                <div>
                  <h2 className="card-heading">
                    {currentUser.name ?? "Unnamed member"}
                  </h2>
                  <p className="card-copy">
                    {currentUser.email ?? "No email available"}
                  </p>
                </div>
              </div>

              <dl className="meta-list">
                <div className="meta-item">
                  <dt>Role</dt>
                  <dd>
                    <span
                      className={`pill ${currentUser.role === "ADMIN" ? "admin" : ""}`}
                    >
                      {currentUser.role}
                    </span>
                  </dd>
                </div>
                <div className="meta-item">
                  <dt>Joined</dt>
                  <dd>{formatDate(currentUser.createdAt)}</dd>
                </div>
                <div className="meta-item">
                  <dt>Profile record</dt>
                  <dd>{currentUser.profile ? "Present" : "Not created yet"}</dd>
                </div>
              </dl>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
