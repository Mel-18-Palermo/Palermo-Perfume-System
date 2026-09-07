import type { PalermoApi } from "../../contracts/api";
import type { ApiResult } from "../../contracts/common";
import { failure } from "./result";

/** Real endpoints are implemented by their owning issues. Never fall back to demo success. */
export function createUnavailableApi(): PalermoApi {
  const unavailable = (): Promise<ApiResult<never>> => Promise.resolve(failure("TEMPORARILY_UNAVAILABLE"));
  return {
    auth: {
      register: unavailable, verify: unavailable, login: unavailable, logout: unavailable,
      getSession: unavailable, requestPasswordReset: unavailable, completePasswordReset: unavailable,
    },
    catalogue: { list: unavailable, get: unavailable, getFilters: unavailable },
    profile: {
      get: unavailable, update: unavailable, setDeliveryAddress: unavailable,
      setBillingAddress: unavailable, generateIdentity: unavailable, deactivate: unavailable,
    },
    recommendations: { getQuiz: unavailable, generate: unavailable },
    cart: {
      get: unavailable, addItem: unavailable, updateQuantity: unavailable,
      removeItem: unavailable, applyPromotion: unavailable,
    },
    wishlist: { get: unavailable, add: unavailable, remove: unavailable },
    checkout: { getDeliveryMethods: unavailable, submit: unavailable },
    orders: { list: unavailable, get: unavailable, getInvoice: unavailable, requestCancellation: unavailable },
    tracking: { get: unavailable },
    admin: {
      getDashboard: unavailable, listCatalogue: unavailable, getPerfume: unavailable,
      createPerfume: unavailable, updatePerfume: unavailable, archivePerfume: unavailable,
      createVariant: unavailable, updateVariant: unavailable, listInventory: unavailable,
      listBatches: unavailable, createBatch: unavailable, releaseBatch: unavailable,
    },
  };
}
