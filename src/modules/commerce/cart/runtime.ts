import "server-only";
import { getDatabase } from "../../../lib/db";
import { CartService } from "./service";

export function getCartService(): CartService { return new CartService(getDatabase()); }
