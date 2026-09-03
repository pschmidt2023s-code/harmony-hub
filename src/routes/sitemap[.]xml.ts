import { createFileRoute } from "@tanstack/react-router";
import { getContent } from "@/lib/content.functions";
import { getShopCatalog } from "@/lib/shop.functions";
import { TOUR } from "@/lib/data";

/**
 * Phase 17: Nur Bereiche mit echtem, öffentlichem Inhalt landen in der Sitemap.
 * `/kontakt` ist bewusst noindex, `/tour` erscheint erst mit bestätigten Terminen.
 */
const BASE_PATHS = ["", "musik", "ueber-mich"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;

        let releasePaths: string[] = [];
        let videoPaths: string[] = [];
        let productPaths: string[] = [];
        try {
          const content = await getContent();
          releasePaths = content.releases
            .filter((r) => r.is_public && r.slug)
            .map((r) => `releases/${r.slug}`);
          // getContent liefert bereits nur öffentlich sichtbare Videos.
          videoPaths = content.videos.filter((v) => v.slug).map((v) => `videos/${v.slug}`);
        } catch {
          releasePaths = [];
          videoPaths = [];
        }

        try {
          // getShopCatalog liefert ausschließlich veröffentlichte Produkte.
          const catalog = await getShopCatalog();
          productPaths = catalog.products.filter((p) => p.slug).map((p) => `shop/${p.slug}`);
        } catch {
          productPaths = [];
        }

        const sectionPaths = [
          ...(videoPaths.length ? ["videos"] : []),
          ...(productPaths.length ? ["shop"] : []),
          ...(TOUR.length ? ["tour"] : []),
        ];
        const all = [...BASE_PATHS, ...sectionPaths, ...releasePaths, ...videoPaths, ...productPaths];
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all
  .map(
    (p) =>
      `  <url><loc>${origin}/${p}</loc><changefreq>weekly</changefreq><priority>${
        p === "" ? "1.0" : "0.8"
      }</priority></url>`,
  )
  .join("\n")}
</urlset>`;
        return new Response(body, {
          headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
        });
      },
    },
  },
});
