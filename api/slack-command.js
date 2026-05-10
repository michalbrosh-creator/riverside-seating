import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Disable Vercel's automatic body parsing so we can read the raw body
// (needed for Slack signature verification)
export const config = {
  api: { bodyParser: false },
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function verifySlack(rawBody, headers) {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) return true;
  const sig = headers["x-slack-signature"];
  const ts = headers["x-slack-request-timestamp"];
  if (!sig || !ts) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const base = `v0:${ts}:${rawBody}`;
  const expected = "v0=" + crypto.createHmac("sha256", secret).update(base).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await getRawBody(req);
  if (!verifySlack(rawBody, req.headers)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const params = new URLSearchParams(rawBody);
  const text = params.get("text") || "";
  const userName = params.get("user_name") || "unknown";
  const userId = params.get("user_id") || "";

  if (!text.trim()) {
    return res.json({
      response_type: "ephemeral",
      text: "Please include a description. Example: `/officeask broken AC in the office`",
    });
  }

  // Respond to Slack immediately (3-second limit)
  res.json({
    response_type: "ephemeral",
    text: `Got it! Ticket submitted ✓ _"${text.trim()}"_`,
  });

  // Insert after responding — Vercel keeps the function alive until timeout
  await supabase.from("facilities_tickets").insert([{
    description: text.trim(),
    severity: "medium",
    type: "facilities",
    status: "open",
    created_by_name: userName,
    created_by_email: `${userId}@slack`,
  }]).then(({ error }) => {
    if (error) console.error("Supabase insert error", error);
  });
}
