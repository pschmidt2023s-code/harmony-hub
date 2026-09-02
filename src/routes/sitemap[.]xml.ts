import { createFileRoute } from "@tanstack/react-router";

const PATHS = ["", "musik", "videos", "shop", "tour", "ueber-mich", "kontakt"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;
        const today = new Date().toISOString().slice(0, 10);
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PATHS.map(
  (p) =>
    `  <url><loc>${origin}/${p}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${
      p === "" ? "1.0" : "0.8"
    }</priority></url>`,
).join("\n")}
</urlset>`;
        return new Response(body, {
          headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
        });
      },
    },
  },
});
