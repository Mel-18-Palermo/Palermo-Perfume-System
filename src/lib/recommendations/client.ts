import type { ApiResult } from "../../contracts/common";
import type { RecommendationsApi } from "../../contracts/recommendations";
async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> { const response = await fetch(`/api/recommendations/${path}`, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } }); return response.json() as Promise<ApiResult<T>>; }
export function createRecommendationsHttpClient(): RecommendationsApi { return { getQuiz: () => request("quiz", { method: "GET" }), generate: input => request("generate", { method: "POST", body: JSON.stringify(input) }) }; }
