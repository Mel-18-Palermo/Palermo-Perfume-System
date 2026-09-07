/** Transport values are JSON-compatible; IDs are opaque and timestamps are ISO 8601 UTC. */
export type EntityId = string;
export type Timestamp = string;
export type Revision = string;

/** Non-negative safe integer in the currency's minor unit; never a floating-point price. */
export type MoneyValue = Readonly<{ amountMinor: number; currency: string }>;
export type Option = Readonly<{ id: EntityId; label: string }>;
export type PageRequest = Readonly<{ page?: number; pageSize?: number }>;
export type Page<T> = Readonly<{
  items: readonly T[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}>;

export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TEMPORARILY_UNAVAILABLE"
  | "INTEGRATION_ERROR"
  | "INTERNAL_ERROR";

export type AppError = Readonly<{
  code: AppErrorCode;
  message: string;
  fieldErrors?: Readonly<Record<string, readonly string[]>>;
}>;
export type ApiResult<T> =
  | Readonly<{ ok: true; data: T }>
  | Readonly<{ ok: false; error: AppError }>;
export type Endpoint<Input, Output> = (input: Input) => Promise<ApiResult<Output>>;
export type Acknowledgement = Readonly<{ acknowledged: true }>;

/** Server adapters must validate unknown payloads before returning canonical DTOs. */
export function isMoneyValue(value: unknown): value is MoneyValue {
  return typeof value === "object" && value !== null
    && "amountMinor" in value && typeof value.amountMinor === "number"
    && Number.isSafeInteger(value.amountMinor) && value.amountMinor >= 0
    && "currency" in value && typeof value.currency === "string"
    && /^[A-Z]{3}$/.test(value.currency);
}
