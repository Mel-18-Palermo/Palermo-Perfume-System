import "server-only";
import { getDatabase } from "../../../lib/db";
import { PaymentService } from "./service";
export function getPaymentService(): PaymentService { return new PaymentService(getDatabase()); }
