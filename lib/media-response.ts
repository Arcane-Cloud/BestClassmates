export function mediaRedirect(url: string) {
  return new Response(null, { status: 307, headers: {
    Location: url,
    "Cache-Control": "private, no-store, max-age=0",
    "CDN-Cache-Control": "no-store",
    "Vercel-CDN-Cache-Control": "no-store",
    Pragma: "no-cache",
    Expires: "0",
    "Referrer-Policy": "no-referrer",
  } });
}
