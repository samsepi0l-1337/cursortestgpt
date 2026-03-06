import Link from "next/link";
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildRegisterUrl(error: string) {
  const params = new URLSearchParams();
  params.set("error", error);
  return `/register?${params.toString()}`;
}

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const params = await searchParams;
  const error = getSingleValue(params.error);

  async function registerAction(formData: FormData) {
    "use server";

    const parsedRegistration = registerSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsedRegistration.success) {
      redirect(
        buildRegisterUrl(
          parsedRegistration.error.issues[0]?.message ??
            "Unable to create the account.",
        ),
      );
    }

    const passwordHash = await hash(parsedRegistration.data.password, 12);

    try {
      await prisma.$transaction(
        async (transaction) => {
          const existingUser = await transaction.user.findUnique({
            where: {
              email: parsedRegistration.data.email,
            },
            select: {
              id: true,
            },
          });

          if (existingUser) {
            redirect(
              buildRegisterUrl("An account with that email already exists."),
            );
          }

          const existingUserCount = await transaction.user.count();

          await transaction.user.create({
            data: {
              name: parsedRegistration.data.name,
              email: parsedRegistration.data.email,
              passwordHash,
              role: existingUserCount === 0 ? "ADMIN" : "USER",
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
        caughtError.code === "P2002"
      ) {
        redirect(
          buildRegisterUrl("An account with that email already exists."),
        );
      }

      if (
        caughtError instanceof Prisma.PrismaClientKnownRequestError &&
        caughtError.code === "P2034"
      ) {
        redirect(buildRegisterUrl("Please retry the registration request."));
      }

      throw caughtError;
    }

    await signIn("credentials", {
      email: parsedRegistration.data.email,
      password: parsedRegistration.data.password,
      redirectTo: "/profile",
    });
  }

  return (
    <main className="site-shell">
      <div className="site-frame auth-grid">
        <section className="masthead">
          <span className="eyebrow">Greenfield Auth</span>
          <h1 className="display-title">Create the first account.</h1>
          <p className="lead">
            Registration writes the user record directly through Prisma, hashes
            the password, and signs the new user into the protected dashboard in
            one server round trip.
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
              <h2 className="card-title">Set up your account</h2>
              <p className="card-copy">
                The first registered user is promoted to admin so the dashboard
                has an owner from day one.
              </p>
            </div>

            <form
              action={registerAction}
              className="form-grid"
            >
              <div className="field">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                />
              </div>

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
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              <button
                className="button full-width"
                type="submit"
              >
                Create account
              </button>
            </form>

            <p className="helper-text">
              Already have an account?{" "}
              <Link href="/login">Sign in instead</Link>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
