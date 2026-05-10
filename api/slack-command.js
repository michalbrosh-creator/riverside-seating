import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const OFFICE_MANAGER_ID = "U0A27EZ75QS";

const AUTO_REPLY = "Thanks for your request! 🙌\nThe facilities team has received it and will take a look.";

async function notifySlack(ticket) {
  const webhook = process.env.VITE_SLACK_WEBHOOK_URL;
  if (!webhook) return;
  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `<@${OFFICE_MANAGER_ID}> New Facilities ticket from ${ticket.created_by_name}: ${ticket.description}`,
    }),
  }).catch(() => {});
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

  const text = (req.body?.text || "").trim();
  const userName = req.body?.user_name || "unknown";
  const userId = req.body?.user_id || "";

  if (!text) {
    return res.json({
      response_type: "ephemeral",
      text: "Please include a description. Example: `/officeask broken AC in the office`",
    });
  }

  const { error } = await supabase.from("facilities_tickets").insert([{
    description: text,
    severity: "medium",
    type: "facilities",
    status: "open",
    created_by_name: userName,
    created_by_email: `${userId}@slack`,
  }]);

  if (error) {
    console.error("Supabase insert error", error);
    return res.json({
      response_type: "ephemeral",
      text: "Something went wrong. Please try again.",
    });
  }

  await notifySlack({ created_by_name: userName, description: text });
  await sendDM(userId, AUTO_REPLY);

  return res.json({
    response_type: "ephemeral",
    text: `Got it! Ticket submitted ✓ _"${text}"_`,
  });
}
