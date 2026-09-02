const HEALTH_RESPONSE = {
  status: "ok",
} as const;

export function GET(): Response {
  return Response.json(HEALTH_RESPONSE, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
