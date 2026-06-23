/// <reference lib="es2022" />

interface AssetFetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface Env {
  ASSETS: AssetFetcher;
}

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src 'self' https://challenges.cloudflare.com",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": [
    "accelerometer=()",
    "camera=()",
    "geolocation=()",
    "gyroscope=()",
    "magnetometer=()",
    "microphone=()",
    "payment=()",
    "usb=()",
  ].join(", "),
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "0",
} as const;

const IMMUTABLE_ASSET_PATH =
  /^\/_astro\/.+\.(?:css|js|mjs|png|jpe?g|webp|avif|gif|svg|ico|woff2?)$/i;
const STATIC_ASSET_PATH =
  /\.(?:css|js|mjs|png|jpe?g|webp|avif|gif|svg|ico|woff2?|txt|xml)$/i;

function appendHeaders(request: Request, response: Response): Response {
  const securedResponse = new Response(response.body, response);

  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    securedResponse.headers.set(header, value);
  }

  const { pathname } = new URL(request.url);
  if (response.ok && IMMUTABLE_ASSET_PATH.test(pathname)) {
    securedResponse.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
  } else if (response.ok && STATIC_ASSET_PATH.test(pathname)) {
    securedResponse.headers.set("Cache-Control", "public, max-age=86400");
  }

  return securedResponse;
}

function redirectToApex(request: Request): Response | undefined {
  const url = new URL(request.url);
  if (url.hostname !== "www.zrr.dev") return undefined;

  url.hostname = "zrr.dev";
  const response = Response.redirect(url, 308);
  return appendHeaders(request, response);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const redirect = redirectToApex(request);
    if (redirect) return redirect;

    const response = await env.ASSETS.fetch(request);
    return appendHeaders(request, response);
  },
};
