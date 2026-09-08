import "server-only";
import { getDatabase } from "../../../lib/db";
import { WishlistService } from "./service";
export function getWishlistService(): WishlistService { return new WishlistService(getDatabase()); }
