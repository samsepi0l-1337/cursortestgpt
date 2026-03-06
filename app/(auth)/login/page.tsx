import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { resolveRedirectTo } from "@/lib/auth-utils";
import { signInSchema } from "@/lib/validation";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildLoginUrl(error: string, redirectTo: string) {
  const params = new URLSearchParams();
  params.set("error", error);
  params.set("redirectTo", redirectTo);
  return `/login?${params.toString()}`;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = resolveRedirectTo(
    getSingleValue(params.redirectTo),
    "/profile",
  );
  const error = getSingleValue(params.error);

  async function loginAction(formData: FormData) {
    "use server";

    const parsedCredentials = signInSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const nextPath = resolveRedirectTo(formData.get("redirectTo"), "/profile");

    if (!parsedCredentials.success) {
      redirect(
        buildLoginUrl(
          parsedCredentials.error.issues[0]?.message ?? "Invalid credentials.",
          nextPath,
        ),
      );
    }

    try {
      await signIn("credentials", {
        email: parsedCredentials.data.email,
        password: parsedCredentials.data.password,
        redirectTo: nextPath,
      });
    } catch (caughtError) {
      if (caughtError instanceof AuthError) {
        const message =
          caughtError.type === "CredentialsSignin" ?
            "Incorrect email or password."
          : "Unable to sign in right now.";

        redirect(buildLoginUrl(message, nextPath));
      }

      throw caughtError;
    }
  }

  return (
    <main className="site-shell">
      <div className="site-frame auth-grid">
        <section className="masthead">
          <span className="eyebrow">User Management</span>
          <h1 className="display-title">Sign in to the control desk.</h1>
          <p className="lead">
            Credentials auth is configured for the App Router stack, with
            guarded dashboard routes and admin-only controls waiting on the
            other side.
          </p>
          {error ?
            <div
              className="status-banner"
              data-tone="error"
            >
              {error}
            </div>
          : null}
        </section>

        <section className="panel">
          <div className="panel-inner stack">
            <div>
              <h2 className="card-title">Welcome back</h2>
              <p className="card-copy">
                Use the email and password tied to your account.
              </p>
            </div>

            <form
              action={loginAction}
              className="form-grid"
            >
              <input
                type="hidden"
                name="redirectTo"
                value={redirectTo}
              />

              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  minLength={8}
                  required
                />
              </div>

              <button
                className="button full-width"
                type="submit"
              >
                Sign in
              </button>
            </form>

            <p className="helper-text">
              Need an account? <Link href="/register">Create one here</Link>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
