import type { AdminApi } from "./admin";
import type { AuthApi } from "./auth";
import type { CartApi } from "./cart";
import type { CatalogueApi } from "./catalogue";
import type { CheckoutApi } from "./checkout";
import type { OrdersApi } from "./orders";
import type { PaymentApi } from "./payment";
import type { ProfileApi } from "./profile";
import type { RecommendationsApi } from "./recommendations";
import type { TrackingApi } from "./tracking";
import type { WishlistApi } from "./wishlist";

export type PalermoApi = Readonly<{
  auth: AuthApi; catalogue: CatalogueApi; profile: ProfileApi;
  recommendations: RecommendationsApi; cart: CartApi; wishlist: WishlistApi;
  checkout: CheckoutApi; orders: OrdersApi; payment: PaymentApi; tracking: TrackingApi; admin: AdminApi;
}>;
