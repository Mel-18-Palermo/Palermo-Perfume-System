import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import Image, { getImageProps } from "next/image";
import Link from "next/link";

import type { CatalogueFilters, PerfumeSummary } from "@/contracts/catalogue";
import type { MoneyValue } from "@/contracts/common";

import styles from "./landing-page.module.css";

const DISCOVERY_PRODUCT_IDS = [
  "27100000-0000-4000-8000-000000001010",
  "27100000-0000-4000-8000-000000001000",
] as const;
const COMPOSITION_PRODUCT_ID = "27100000-0000-4000-8000-000000001060";

interface LandingPageProps {
  products: readonly PerfumeSummary[];
  filters: CatalogueFilters | null;
  availabilityByProductId: Readonly<Record<string, "AVAILABLE" | "OUT_OF_STOCK">>;
  recommendationHref: string;
}

interface ResponsiveCampaignImageProps {
  alt: string;
  desktopSrc: string;
  mobileSrc: string;
  priority?: boolean;
  className?: string | undefined;
  mobileMedia?: string | undefined;
}

function ResponsiveCampaignImage({ alt, desktopSrc, mobileSrc, priority = false, className, mobileMedia = "(max-width: 63.99rem)" }: ResponsiveCampaignImageProps) {
  const common = { alt, fill: true, sizes: "100vw", priority } as const;
  const { props: desktop } = getImageProps({ ...common, src: desktopSrc });
  const { props: mobile } = getImageProps({ ...common, src: mobileSrc });
  return <picture><source media={mobileMedia} srcSet={mobile.srcSet} sizes={mobile.sizes} /><img {...desktop} alt={alt} className={className} /></picture>;
}

function formatPrice(money: MoneyValue): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: money.currency, maximumFractionDigits: 0 }).format(money.amountMinor / 100);
}

function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className={styles.textLink}><span>{children}</span><ArrowRight aria-hidden="true" /></Link>;
}

function ProductImage({ product, sizes }: { product: PerfumeSummary; sizes: string }) {
  if (!product.imageUrl) return <span className={styles.productImageUnavailable}>Image unavailable</span>;
  return <Image src={product.imageUrl} alt={product.name} fill sizes={sizes} className={styles.productImage} />;
}

function ProductTile({ product, availability }: { product: PerfumeSummary; availability?: "AVAILABLE" | "OUT_OF_STOCK" | undefined }) {
  const productHref = `/product/${product.id}`;
  return (
    <article className={styles.productTile}>
      <Link href={productHref} className={styles.productImageLink}><div className={styles.productImageFrame}><ProductImage product={product} sizes="(max-width: 39.99rem) 78vw, (max-width: 63.99rem) 44vw, 20vw" /></div></Link>
      <div className={styles.productDetails}>
        <p className={styles.productFamily}>{product.primaryFamily.label}</p>
        <h3><Link href={productHref}>{product.name}</Link></h3>
        <p className={styles.productMeta}>From {formatPrice(product.priceFrom)}{product.intensity ? ` · ${product.intensity.label}` : ""}{availability ? ` · ${availability === "AVAILABLE" ? "Available" : "Out of stock"}` : ""}</p>
      </div>
    </article>
  );
}

function CompositionProduct({ product }: { product: PerfumeSummary | undefined }) {
  if (!product) return <TextLink href="/catalogue">Explore the collection</TextLink>;
  return <div className={styles.compositionProduct}><p>{product.primaryFamily.label}</p><h3>{product.name}</h3><span>From {formatPrice(product.priceFrom)}</span><TextLink href={`/product/${product.id}`}>View fragrance</TextLink></div>;
}

export function LandingPage({ products, filters, availabilityByProductId, recommendationHref }: LandingPageProps) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const featuredProducts = DISCOVERY_PRODUCT_IDS.flatMap((id) => {
    const product = productById.get(id);
    return product && availabilityByProductId[id] === "AVAILABLE" ? [product] : [];
  });
  const compositionCandidate = productById.get(COMPOSITION_PRODUCT_ID);
  const compositionProduct = availabilityByProductId[COMPOSITION_PRODUCT_ID] === "AVAILABLE"
    ? compositionCandidate
    : undefined;
  const families = filters?.family.filter((family) => family.label !== "Unclassified").slice(0, 4) ?? [];

  return (
    <div className={styles.landing}>
      <section className={styles.hero} aria-labelledby="landing-hero-heading">
        <ResponsiveCampaignImage desktopSrc="/images/landing/hero-desktop.png" mobileSrc="/images/landing/hero-mobile.png" alt="Palermo fragrance bottle illuminated by warm amber light" className={styles.campaignImage} priority />
        <div className={styles.heroShade} />
        <div className={styles.heroContent}><p className={styles.eyebrow}>Palermo</p><h1 id="landing-hero-heading">Fragrance,<br />reimagined.</h1><TextLink href="/catalogue">Discover the collection</TextLink></div>
      </section>

      <section className={styles.collection} aria-labelledby="collection-heading">
        <div className={styles.collectionLead}><p className={styles.eyebrow}>The collection</p><h2 id="collection-heading">Scent, composed with intention.</h2><p>A modern fragrance wardrobe built around clarity, character, and the notes that stay with you.</p><TextLink href="/catalogue">View the collection</TextLink></div>
        {featuredProducts.length > 0 ? <div className={styles.productRail}>{featuredProducts.map((product) => <ProductTile key={product.id} product={product} availability={availabilityByProductId[product.id]} />)}</div> : <div className={styles.collectionFallback}><p>The collection is being prepared.</p><TextLink href="/catalogue">Explore the catalogue</TextLink></div>}
      </section>

      <section className={styles.composition} aria-labelledby="composition-heading">
        <div className={styles.compositionImageWrap}><Image src="/images/landing/editorial-detail.png" alt="Close detail of amber Palermo fragrance glass" fill sizes="(max-width: 63.99rem) 100vw, 50vw" className={styles.compositionImage} /></div>
        <div className={styles.compositionContent}><p className={styles.eyebrow}>The art of composition</p><h2 id="composition-heading">Light, held in glass.</h2><p>Each Palermo fragrance is shaped as a study in contrast: luminous notes, grounded warmth, and depth that reveals itself slowly.</p><CompositionProduct product={compositionProduct} /></div>
      </section>

      <section className={styles.direction} aria-labelledby="direction-heading">
        <div className={styles.directionHeader}><h2 id="direction-heading">Find your direction</h2><p>Move from brightness to warmth, guided by the character of each composition.</p></div>
        {families.length > 0 ? <div className={styles.familyGrid}>{families.map((family, index) => <Link key={family.id} href={{ pathname: "/catalogue", query: { family: family.id } }} className={styles.familyItem}><span className={styles.familyNumber}>{String(index + 1).padStart(2, "0")}</span><span>{family.label}</span><ArrowRight aria-hidden="true" /></Link>)}</div> : <TextLink href="/catalogue">Explore by fragrance family</TextLink>}
      </section>

      <section className={styles.consultation} aria-labelledby="consultation-heading">
        <div className={styles.consultationCopy}><p className={styles.eyebrow}>Guided discovery</p><h2 id="consultation-heading">Find your scent</h2><p>Citrus, woods, warmth, depth. Discover a fragrance shaped around what draws you in.</p><div className={styles.consultationLinks}><TextLink href={recommendationHref}>Begin consultation</TextLink><TextLink href="/catalogue">Browse the catalogue</TextLink></div></div>
        <div className={styles.consultationImageWrap}><ResponsiveCampaignImage desktopSrc="/images/landing/recommendation-desktop.png" mobileSrc="/images/landing/recommendation-mobile.png" alt="Amber glass, citrus, stone, and wood arranged in low light" className={styles.consultationImage} priority /></div>
      </section>
    </div>
  );
}
