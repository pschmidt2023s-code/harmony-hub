import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Section } from "@/components/Section";
import { ProductDetail } from "@/components/shop/ProductDetail";
import { money, shopCatalogQueryOptions, shopQueryOptions } from "@/lib/shop";
import { canonicalUrl, jsonLd, normalizeSettings, seoHead, socialImage } from "@/lib/seo";

export const Route = createFileRoute("/shop/$slug")({
  loader: async ({ context, params }) => {
    const { products, settings } = await context.queryClient.ensureQueryData(shopCatalogQueryOptions);
    const product = products.find((p) => p.slug === params.slug);
    if (!product) throw notFound();
    return { product, settings };
  },
  head: ({ loaderData, params }) => {
    const st = normalizeSettings(loaderData?.settings);
    const p = loaderData?.product;
    const path = `/shop/${params.slug}`;
    if (!p) {
      return seoHead({
        title: "Produkt nicht verfügbar — TAYO Shop",
        description: "Dieses Produkt ist nicht öffentlich verfügbar.",
        path,
        settings: st,
        noindex: true,
      });
    }
    const title = p.seoTitle || `${p.name} — ${st.artist_name} Shop`;
    const description =
      p.seoDescription || p.shortDescription || p.description || `${p.name} im offiziellen ${st.artist_name} Store.`;
    const image = socialImage(p.image, st.default_og_image);
    const head = seoHead({ title, description, path, settings: st, image: p.image, type: "product" });
    return {
      ...head,
      scripts: [
        jsonLd({
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.name,
          url: canonicalUrl(path, st.canonical_base_url),
          ...(description ? { description } : {}),
          ...(image ? { image } : {}),
          brand: { "@type": "Brand", name: st.artist_name },
          offers: {
            "@type": "Offer",
            price: p.price.toFixed(2),
            priceCurrency: p.currency,
            availability:
              p.stock === null || p.stock > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            url: canonicalUrl(path, st.canonical_base_url),
          },
        }),
      ],
    };
  },
  errorComponent: () => (
    <div className="pt-32">
      <Section eyebrow="Store" title="Produkt">
        <p className="text-sm text-muted-foreground">Das Produkt konnte nicht geladen werden.</p>
      </Section>
    </div>
  ),
  notFoundComponent: () => (
    <div className="pt-32">
      <Section eyebrow="Store" title="Produkt nicht gefunden">
        <p className="text-sm text-muted-foreground">Dieses Produkt ist nicht verfügbar.</p>
      </Section>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: products } = useSuspenseQuery(shopQueryOptions);
  const product = products.find((p) => p.slug === slug);
  if (!product) throw notFound();

  return (
    <div className="pt-32">
      <ProductDetail product={product} />
    </div>
  );
}
