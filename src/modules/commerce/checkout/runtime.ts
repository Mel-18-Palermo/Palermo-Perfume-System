import "server-only";
import { getDatabase } from "../../../lib/db";
import { CheckoutService } from "./service";
export function getCheckoutService(): CheckoutService { return new CheckoutService(getDatabase()); }
