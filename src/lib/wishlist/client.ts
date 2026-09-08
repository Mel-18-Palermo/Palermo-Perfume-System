import type { WishlistApi } from "../../contracts/wishlist";
import type { ApiResult } from "../../contracts/common";
async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> { const response = await fetch(`/api/wishlist/${path}`, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) }, credentials: "same-origin" }); return response.json() as Promise<ApiResult<T>>; }
export function createWishlistHttpClient(): WishlistApi { return { get: () => request("get", { method: "GET" }), add: input => request("add", { method: "POST", body: JSON.stringify(input) }), remove: input => request("remove", { method: "POST", body: JSON.stringify(input) }) }; }
