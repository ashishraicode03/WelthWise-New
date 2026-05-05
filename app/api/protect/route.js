import arcjet, { shield, detectBot } from "@arcjet/next";

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({
      mode: "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE", "GO_HTTP"],
    }),
  ],
});

export async function GET(req) {
  const decision = await aj.protect(req);

  if (decision.isDenied()) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  return Response.json({ success: true });
}