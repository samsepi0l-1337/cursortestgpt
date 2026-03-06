import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const search = req.nextUrl.search;
  const isLoggedIn = Boolean(req.auth);
  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const isProfileRoute = pathname.startsWith("/profile");
  const isAdminRoute = pathname.startsWith("/admin");
  const redirectTo = `${pathname}${search}`;

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/profile", req.nextUrl));
  }

  if ((isProfileRoute || isAdminRoute) && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("redirectTo", redirectTo);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/login", "/register", "/profile/:path*", "/admin/:path*"],
};
