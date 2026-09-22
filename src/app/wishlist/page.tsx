import { WishlistClient } from "./_components/WishlistClient";

export default function WishlistPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Wishlist</h1>
      <WishlistClient />
    </main>
  );
}
