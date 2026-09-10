import type { ProfileApi } from "../../contracts/profile";
import type { ApiResult } from "../../contracts/common";

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(`/api/profile/${path}`, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) }, credentials: "same-origin" });
  return response.json() as Promise<ApiResult<T>>;
}
export function createProfileHttpClient(): ProfileApi {
  return {
    get: () => request("get", { method: "GET" }),
    update: input => request("update", { method: "POST", body: JSON.stringify(input) }),
    setDeliveryAddress: input => request("delivery-address", { method: "POST", body: JSON.stringify(input) }),
    setBillingAddress: input => request("billing-address", { method: "POST", body: JSON.stringify(input) }),
    generateIdentity: input => request("generate-identity", { method: "POST", body: JSON.stringify(input) }),
    deactivate: input => request("deactivate", { method: "POST", body: JSON.stringify(input) }),
  };
}
