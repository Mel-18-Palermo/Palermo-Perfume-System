/** Shared without importing the Node-only auth HTTP route helpers. */
export const SESSION_COOKIE = process.env["NODE_ENV"] === "production" ? "__Host-palermo_session" : "palermo_session";
