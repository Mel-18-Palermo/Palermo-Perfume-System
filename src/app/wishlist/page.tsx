import type { Metadata } from "next";
import { WishlistView } from "./_components/wishlist-view";

export const metadata: Metadata = {
  title: "Wishlist | Palermo Parfums",
  description: "Review the Palermo fragrances saved to your account.",
};

export default function WishlistPage() {
  return <WishlistView />;
}
