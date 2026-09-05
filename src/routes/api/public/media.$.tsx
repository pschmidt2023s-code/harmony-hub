import { createFileRoute } from "@tanstack/react-router";

/**
 * Liefert Dateien aus dem privaten Storage-Bucket "media" aus.
 * Der Bucket bleibt privat; gelesen wird ausschließlich mit dem öffentlichen
 * Publishable-Key (die vorhandene Lese-Policy erlaubt genau das) — es werden
 * keine privilegierten Rechte verwendet und nichts geschrieben.
 */
export const Route = createFileRoute("/api/public/media/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const path = String((params as { _splat?: string })._splat ?? "");
        if (!path || path.includes("..")) return new Response("Not found", { status: 404 });

        const url = `${process.env["SUPABASE_URL"]}/storage/v1/object/media/${path
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`;
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const range = request.headers.get("range");
        const upstream = await fetch(url, {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            ...(range ? { Range: range } : {}),
          },
        });
        if (!upstream.ok || !upstream.body) return new Response("Not found", { status: 404 });

        const headers = new Headers({
          "content-type": upstream.headers.get("content-type") ?? "application/octet-stream",
          "cache-control": "public, max-age=3600, s-maxage=86400",
          "accept-ranges": upstream.headers.get("accept-ranges") ?? "bytes",
        });
        const contentRange = upstream.headers.get("content-range");
        const contentLength = upstream.headers.get("content-length");
        if (contentRange) headers.set("content-range", contentRange);
        if (contentLength) headers.set("content-length", contentLength);

        return new Response(upstream.body, {
          status: upstream.status,
          headers,
        });
      },
    },
  },
});
