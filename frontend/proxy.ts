import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";

// "Content-Security-Policy-Report-Only" reports what the policy would block
// in the browser console, and blocks nothing. "Content-Security-Policy"
// blocks.
const CSP_HEADER = "Content-Security-Policy";

export function proxy(request: NextRequest) {
  // A new random value for each request: only the scripts and the styles that
  // carry it are allowed to run.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const policy = [
    "default-src 'self'",
    // 'strict-dynamic': a script that carries the nonce may load other
    // scripts. The development server needs eval, the production one does not.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // The development tools add styles without a nonce. A nonce makes the
    // browser ignore 'unsafe-inline', so only one of the two is given.
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    // The browser may only call this application and the API.
    `connect-src 'self' ${API_BASE_URL}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  // Next.js reads the policy in the headers of the request to put the nonce
  // on its own scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CSP_HEADER, policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP_HEADER, policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Not the static files. Not the prefetch requests either: they do not
      // render a page.
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
