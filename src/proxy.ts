import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const protectedPaths = ["/dashboard", "/admin", "/system-admin", "/profile/edit"];
const authPaths = ["/login", "/register"];

export default auth((req) => {
  const { nextUrl, auth: session } = req as any;
  const pathname = nextUrl.pathname;

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isAuthPath = authPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isAuthPath && session) {
    const role = session.user?.role;
    if (role === "system_admin") return NextResponse.redirect(new URL("/system-admin", nextUrl));
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Role-based route protection
  if (pathname.startsWith("/system-admin") && session?.user?.role !== "system_admin") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)"],
};
