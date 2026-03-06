import Link from "next/link";
import { signOut } from "@/auth";
import { isAdminRole } from "@/lib/auth-utils";
import { requireSignedIn } from "@/lib/permissions";

type DashboardLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const currentUser = await requireSignedIn("/profile");

  async function signOutAction() {
    "use server";

    await signOut({
      redirectTo: "/login",
    });
  }

  return (
    <main className="site-shell">
      <div className="site-frame dashboard-grid">
        <aside className="dashboard-sidebar">
          <section className="panel">
            <div className="panel-inner stack">
              <div>
                <span className="eyebrow">Control Desk</span>
                <h1
                  className="card-title"
                  style={{ marginTop: 18 }}
                >
                  {currentUser.name ?? "Unnamed member"}
                </h1>
                <p className="card-copy">
                  {currentUser.email ?? "Signed-in account"}
                </p>
              </div>

              <nav
                className="dashboard-nav"
                aria-label="Dashboard"
              >
                <Link href="/profile">Profile</Link>
                {isAdminRole(currentUser.role) ?
                  <Link href="/admin">Admin tools</Link>
                : null}
              </nav>

              <form action={signOutAction}>
                <button
                  className="button secondary full-width"
                  type="submit"
                >
                  Sign out
                </button>
              </form>
            </div>
          </section>
        </aside>

        <section>{children}</section>
      </div>
    </main>
  );
}
