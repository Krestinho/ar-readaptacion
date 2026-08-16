import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { url, anonKey } = getSupabasePublicEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/plan");
  const isPasswordUpdate = pathname.startsWith("/auth/update-password");

  if (!user && isProtected) {
    const urlRedirect = request.nextUrl.clone();
    urlRedirect.pathname = "/";
    urlRedirect.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(urlRedirect);
  }

  if (user && (isProtected || pathname === "/")) {
    let profile: {
      must_change_password?: boolean | null;
      is_active?: boolean | null;
    } | null = null;

    const withFlag = await supabase
      .from("profiles")
      .select("must_change_password, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (!withFlag.error) {
      profile = withFlag.data;
    } else {
      const fallback = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", user.id)
        .maybeSingle();
      profile = fallback.data
        ? { ...fallback.data, must_change_password: false }
        : null;
    }

    if (profile && !profile.is_active && isProtected) {
      const urlRedirect = request.nextUrl.clone();
      urlRedirect.pathname = "/";
      return NextResponse.redirect(urlRedirect);
    }

    if (profile?.must_change_password && !isPasswordUpdate) {
      const urlRedirect = request.nextUrl.clone();
      urlRedirect.pathname = "/auth/update-password";
      return NextResponse.redirect(urlRedirect);
    }
  }

  return supabaseResponse;
}
