import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const HIBOB_MANAGER_ID = "U0B2U18A6HW"; // Lilach Stencel
const AUTO_REPLY = "Thanks for your request! 🙌\nThe team has received it and will take a look.";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

async function sendDM(slackUserId, text) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token || !slackUserId) return;
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ channel: slackUserId, text }),
  }).catch(() => {});
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await getRawBody(req);
  if (!verifySlack(rawBody, req.headers)) return res.status(401).json({ error: "Invalid signature" });

  const params = new URLSearchParams(rawBody);
  const text = (params.get("text") || "").trim();
  const userName = params.get("user_name") || "unknown";
  const userId = params.get("user_id") || "";

  if (!text) {
    return res.json({
      response_type: "ephemeral",
      text: "Please include a description. Example: `/bobask update my start date`",
    });
  }

  const { error } = await supabase.from("hibob_tickets").insert([{
    description: text,
    status: "open",
    created_by_name: userName,
    created_by_email: `${userId}@slack`,
  }]);

  if (error) {
    console.error("Supabase insert error", error);
    return res.json({ response_type: "ephemeral", text: "Something went wrong. Please try again." });
  }

  const webhook = process.env.HIBOB_SLACK_WEBHOOK_URL;
  if (webhook) {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `<@${HIBOB_MANAGER_ID}> New HiBob request from ${userName}: ${text}`,
      }),
    }).catch(() => {});
  }

  await sendDM(userId, AUTO_REPLY);

  return res.json({
    response_type: "ephemeral",
    text: `Got it! Request submitted ✓ _"${text}"_`,
  });
}
