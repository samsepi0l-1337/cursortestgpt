import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import {
  deleteUserAction,
  updateUserRoleAction,
} from "@/app/(dashboard)/admin/actions";

type AdminPageProps = {
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

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const message = getSingleValue(params.message);
  const error = getSingleValue(params.error);
  const currentAdmin = await requireAdmin();

  const users = await prisma.user.findMany({
    include: {
      profile: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const adminCount = users.filter((user) => user.role === "ADMIN").length;
  const profileCount = users.filter((user) => user.profile).length;

  return (
    <div className="stack">
      <section className="masthead">
        <span className="eyebrow">Admin Dashboard</span>
        <h1 className="display-title">Manage the member ledger.</h1>
        <p className="lead">
          Role changes and destructive actions are guarded on the server, not
          just in the UI, so the dashboard and backend authorization stay
          aligned.
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

      <section className="metrics">
        <article className="metric-card">
          <span className="metric-label">Total users</span>
          <strong className="metric-value">{users.length}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Admins</span>
          <strong className="metric-value">{adminCount}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Profiles completed</span>
          <strong className="metric-value">{profileCount}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-inner stack">
          <div>
            <h2 className="card-title">User roster</h2>
            <p className="card-copy">
              Every row reflects live Prisma data. Your own account is marked as
              the active session and cannot be demoted or deleted from this
              screen.
            </p>
          </div>

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">Role</th>
                  <th scope="col">Profile</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Controls</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isCurrentUser = user.id === currentAdmin.id;

                  return (
                    <tr key={user.id}>
                      <td>
                        <div
                          className="stack"
                          style={{ gap: 6 }}
                        >
                          <span className="user-chip">
                            <span className="user-dot" />
                            <strong>{user.name ?? "Unnamed member"}</strong>
                          </span>
                          <span className="helper-text">
                            {user.email ?? "No email available"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`pill ${user.role === "ADMIN" ? "admin" : ""}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td>{user.profile ? "Complete" : "Starter"}</td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        {isCurrentUser ?
                          <span className="helper-text">Current session</span>
                        : <div
                            className="stack"
                            style={{ gap: 12 }}
                          >
                            <form
                              action={updateUserRoleAction}
                              className="cluster"
                            >
                              <input
                                type="hidden"
                                name="userId"
                                value={user.id}
                              />
                              <select
                                name="role"
                                defaultValue={user.role}
                              >
                                <option value="USER">USER</option>
                                <option value="ADMIN">ADMIN</option>
                              </select>
                              <button
                                className="button secondary"
                                type="submit"
                              >
                                Save role
                              </button>
                            </form>

                            <form action={deleteUserAction}>
                              <input
                                type="hidden"
                                name="userId"
                                value={user.id}
                              />
                              <button
                                className="button danger"
                                type="submit"
                              >
                                Delete user
                              </button>
                            </form>
                          </div>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
