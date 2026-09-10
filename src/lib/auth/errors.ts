import type { AppErrorCode } from "../../contracts/common";

export class AuthFault extends Error {
  constructor(readonly code: AppErrorCode, message: string) { super(message); }
}

export function invalid(message = "Check the supplied authentication details."): never {
  throw new AuthFault("VALIDATION_ERROR", message);
}
