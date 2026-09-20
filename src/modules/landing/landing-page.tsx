import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import Image, { getImageProps } from "next/image";
import Link from "next/link";

import type { CatalogueFilters, PerfumeSummary } from "@/contracts/catalogue";
import type { MoneyValue } from "@/contracts/common";

import styles from "./landing-page.module.css";

interface LandingPageProps {
  products: readonly PerfumeSummary[];
  filters: CatalogueFilters | null;
  availabilityByProductId: Readonly<
    Record<string, "AVAILABLE" | "OUT_OF_STOCK">
  >;
  recommendationHref?: string | undefined;
}

interface ResponsiveCampaignImageProps {
  alt: string;
  desktopSrc: string;
  mobileSrc: string;
  priority?: boolean;
  className?: string | undefined;
  mobileMedia?: string | undefined;
}

function ResponsiveCampaignImage({
  alt,
  desktopSrc,
  mobileSrc,
  priority = false,
  className,
  mobileMedia = "(max-width: 47.99rem)",
}: ResponsiveCampaignImageProps) {
  const common = {
    alt,
    fill: true,
    sizes: "100vw",
    priority,
  } as const;
  const { props: desktop } = getImageProps({ ...common, src: desktopSrc });
  const { props: mobile } = getImageProps({ ...common, src: mobileSrc });

  return (
    <picture>
      <source
        media={mobileMedia}
        srcSet={mobile.srcSet}
        sizes={mobile.sizes}
      />
      {/* getImageProps supplies Next.js' optimized source set to this art-directed picture. */}
      <img {...desktop} alt={alt} className={className} />
    </picture>
  );
}

function formatPrice(money: MoneyValue): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: money.currency,
    maximumFractionDigits: 0,
  }).format(money.amountMinor / 100);
}

function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={styles.textLink}>
      <span>{children}</span>
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}

function ProductItem({
  product,
  availability,
}: {
  product: PerfumeSummary;
  availability?: "AVAILABLE" | "OUT_OF_STOCK" | undefined;
}) {
  const catalogueHref = {
    pathname: "/catalogue",
    query: { q: product.name },
  };

  return (
    <article className={styles.productItem}>
      <Link
        href={catalogueHref}
        className={styles.productImageLink}
        aria-label={`Explore ${product.name} in the catalogue`}
      >
        <div className={styles.productImageFrame}>
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 47.99rem) 86vw, (max-width: 80rem) 43vw, 34rem"
              className={styles.productImage}
            />
          ) : (
            <div className={styles.productPlaceholder} aria-hidden="true">
              <span>PALERMO</span>
              <strong>{product.primaryFamily.label}</strong>
            </div>
          )}
        </div>
      </Link>
      <div className={styles.productDetails}>
        <p className={styles.productFamily}>{product.primaryFamily.label}</p>
        <h3>
          <Link href={catalogueHref}>{product.name}</Link>
        </h3>
        <p className={styles.productMeta}>
          From {formatPrice(product.priceFrom)}
          {product.intensity ? ` · ${product.intensity.label}` : ""}
          {availability
            ? ` · ${availability === "AVAILABLE" ? "Available" : "Out of stock"}`
            : ""}
        </p>
        <TextLink href={`/catalogue?q=${encodeURIComponent(product.name)}`}>
          Explore fragrance
        </TextLink>
      </div>
    </article>
  );
}

export function LandingPage({
  products,
  filters,
  availabilityByProductId,
  recommendationHref,
}: LandingPageProps) {
  const featuredProducts = products.slice(0, 2);
  const families = filters?.family.slice(0, 4) ?? [];

  return (
    <div className={styles.landing}>
      <section className={styles.hero} aria-labelledby="landing-hero-heading">
        <ResponsiveCampaignImage
          desktopSrc="/images/landing/hero-desktop.png"
          mobileSrc="/images/landing/hero-mobile.png"
          alt="Palermo fragrance bottle illuminated by warm amber light"
          className={styles.campaignImage}
          mobileMedia="(max-width: 63.99rem)"
          priority
        />
        <div className={styles.heroShade} />
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>PALERMO</p>
          <h1 id="landing-hero-heading">
            Fragrance,
            <br />
            reimagined.
          </h1>
          <TextLink href="/catalogue">Discover the collection</TextLink>
        </div>
      </section>

      <section className={styles.introduction} aria-labelledby="introduction-heading">
        <p className={styles.eyebrow}>The Palermo perspective</p>
        <h2 id="introduction-heading">Scent, composed with intention.</h2>
        <p>
          A modern fragrance wardrobe built around clarity, character, and the
          notes that stay with you.
        </p>
      </section>

      <section className={styles.commerceSection} aria-labelledby="featured-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>The collection</p>
            <h2 id="featured-heading">Featured fragrances</h2>
          </div>
          <TextLink href="/catalogue">View all fragrances</TextLink>
        </div>

        {featuredProducts.length > 0 ? (
          <div className={styles.productGrid}>
            {featuredProducts.map((product) => (
              <ProductItem
                key={product.id}
                product={product}
                availability={availabilityByProductId[product.id]}
              />
            ))}
          </div>
        ) : (
          <div className={styles.commerceFallback}>
            <p>The collection is being prepared.</p>
            <TextLink href="/catalogue">Explore the catalogue</TextLink>
          </div>
        )}
      </section>

      <section className={styles.editorial} aria-labelledby="editorial-heading">
        <div className={styles.editorialCopy}>
          <p className={styles.eyebrow}>The art of composition</p>
          <h2 id="editorial-heading">Light, held in glass.</h2>
          <p>
            Each Palermo fragrance is shaped as a study in contrast: luminous
            notes, grounded warmth, and depth that reveals itself slowly.
          </p>
          <TextLink href="/catalogue">Explore the collection</TextLink>
        </div>
        <div className={styles.editorialImageWrap}>
          <Image
            src="/images/landing/editorial-detail.png"
            alt="Close detail of amber Palermo fragrance glass"
            fill
            sizes="(max-width: 47.99rem) 100vw, 52vw"
            className={styles.editorialImage}
          />
        </div>
      </section>

      <section className={styles.familySection} aria-labelledby="families-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>A second chapter</p>
            <h2 id="families-heading">Explore by fragrance family</h2>
          </div>
          <p className={styles.sectionNote}>
            Move from brightness to warmth, guided by the character of each
            composition.
          </p>
        </div>

        {families.length > 0 ? (
          <div className={styles.familyGrid}>
            {families.map((family, index) => (
              <Link
                key={family.id}
                href={{ pathname: "/catalogue", query: { family: family.id } }}
                className={styles.familyItem}
              >
                <span className={styles.familyNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{family.label}</span>
                <ArrowRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : (
          <TextLink href="/catalogue">Browse fragrance families</TextLink>
        )}
      </section>

      <section
        className={styles.recommendation}
        aria-labelledby="recommendation-heading"
      >
        <ResponsiveCampaignImage
          desktopSrc="/images/landing/recommendation-desktop.png"
          mobileSrc="/images/landing/recommendation-mobile.png"
          alt="Amber glass, citrus, stone, and wood arranged in low light"
          className={styles.campaignImage}
        />
        <div className={styles.recommendationShade} />
        <div className={styles.recommendationCopy}>
          <p className={styles.heroEyebrow}>Guided discovery</p>
          <h2 id="recommendation-heading">Find your scent</h2>
          <p>
            Citrus, woods, warmth, depth. Discover a fragrance shaped around
            what draws you in.
          </p>
          {recommendationHref ? (
            <TextLink href={recommendationHref}>Find your fragrance</TextLink>
          ) : null}
        </div>
      </section>
    </div>
  );
}
