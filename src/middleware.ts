// middleware.ts
import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers";
import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = ['settings', "upload"]; // Require Auth
const authRoutes = ['auth', '']; //Doesnt Require Auth

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  try {
    const supabase = await createClient(req);
    const { data: { user } } = await supabase.auth.getUser();
  
    const path = req.nextUrl.pathname;
  
    if (user && authRoutes.some(route => route === path.split("/")[1])) {
      const url = new URL("/home", req.url);
      return NextResponse.redirect(url);
    }
  
    // Get first part of the path after the root '/'
    const firstPathSegment = path.split("/")[1];
  
    if (!user && protectedRoutes.includes(firstPathSegment)) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth-required";
      return NextResponse.rewrite(url);
    }
  
    return res;
  } catch {}

}

export const config = {
  matcher: [
    // Protected routes
    '/home',
    '/',
    '/upload',
    '/settings/:path*',

    // Auth routes
    '/auth/:path*',
    '/video/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};