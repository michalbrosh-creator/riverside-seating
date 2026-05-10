const OFFICE_MANAGER_ID = "U0A27EZ75QS";
const AUTO_REPLY = "Thanks for your request! 🙌\nThe facilities team has received it and will take a look.";

async function sendDM(slackUserId, text) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token || !slackUserId) return;
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ channel: slackUserId, text }),
  }).catch(() => {});
}

async function lookupSlackUserByEmail(email) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token || !email) return null;
  const res = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);
  if (!res) return null;
  const data = await res.json().catch(() => null);
  return data?.ok ? data.user?.id : null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { description, createdByName, createdByEmail, type, severity } = req.body || {};
  const typeLabel = type === "hibob" ? "HiBob" : "Facilities";
  const sevLabel = severity ? ` [${severity}]` : "";

  const webhook = process.env.VITE_SLACK_WEBHOOK_URL;
  if (webhook) {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `<@${OFFICE_MANAGER_ID}> New ${typeLabel} ticket${sevLabel} from ${createdByName || "someone"}: ${description}`,
      }),
    }).catch(() => {});
  }

  // Send auto-reply DM to submitter
  if (createdByEmail) {
    const slackUserId = await lookupSlackUserByEmail(createdByEmail);
    if (slackUserId) await sendDM(slackUserId, AUTO_REPLY);
  }

  return res.status(200).end();
}
