import type { Acknowledgement, Endpoint, EntityId } from "./common";

export type AccountStatus = "PENDING_VERIFICATION" | "ACTIVE" | "DEACTIVATED";
export type SessionUser = Readonly<{
  id: EntityId;
  role: "CUSTOMER" | "ADMIN";
  email: string;
  displayName: string;
}>;
export type Session = Readonly<{ user: SessionUser | null }>;
export type RegisterRequest = Readonly<{ name: string; email: string; password: string }>;
export type LoginRequest = Readonly<{ email: string; password: string }>;
export type AuthApi = Readonly<{
  register: Endpoint<RegisterRequest, { readonly status: "PENDING_VERIFICATION" }>;
  verify: Endpoint<{ readonly token: string }, { readonly status: "ACTIVE" }>;
  login: Endpoint<LoginRequest, Session>;
  logout: Endpoint<void, Acknowledgement>;
  getSession: Endpoint<void, Session>;
  requestPasswordReset: Endpoint<{ readonly email: string }, Acknowledgement>;
  completePasswordReset: Endpoint<{
    readonly token: string; readonly password: string;
  }, Acknowledgement>;
}>;
