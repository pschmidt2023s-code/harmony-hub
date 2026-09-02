import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Section } from "@/components/Section";
import { ProductDetail } from "@/components/shop/ProductDetail";
import { shopQueryOptions } from "@/lib/shop";

export const Route = createFileRoute("/shop/$slug")({
  loader: async ({ context, params }) => {
    const products = await context.queryClient.ensureQueryData(shopQueryOptions);
    const product = products.find((p) => p.slug === params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    const title = p ? p.seoTitle || `${p.name} — TAYO Shop` : "Produkt — TAYO Shop";
    const description = p
      ? p.seoDescription || p.shortDescription || `${p.name} im offiziellen TAYO Store.`
      : "Offizielles TAYO Merchandise.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
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
