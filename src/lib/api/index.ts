import type { PalermoApi } from "../../contracts/api";
import { createUnavailableApi } from "./unavailable";
import { createAuthHttpClient } from "../auth/client";
import { createCatalogueHttpClient } from "../catalogue/client";
import { createCartHttpClient } from "../cart/client";
import { createProfileHttpClient } from "../profile/client";
import { createWishlistHttpClient } from "../wishlist/client";
import { createRecommendationsHttpClient } from "../recommendations/client";
import { createCheckoutHttpClient } from "../checkout/client";
import { createOrdersHttpClient } from "../orders/client";
import { createAdminHttpClient } from "../admin/client";

/** Inject one adapter at the composition boundary. Components use the same api.* interface. */
export function createApiClient(adapter: PalermoApi): PalermoApi {
  return adapter;
}

/** Implemented auth uses server routes; other modules remain explicit unavailable boundaries. */
export const api = createApiClient({ ...createUnavailableApi(), auth: createAuthHttpClient(), catalogue: createCatalogueHttpClient(), cart: createCartHttpClient(), profile: createProfileHttpClient(), wishlist: createWishlistHttpClient(), recommendations: createRecommendationsHttpClient(), checkout: createCheckoutHttpClient(), orders: createOrdersHttpClient(), admin: createAdminHttpClient() });
