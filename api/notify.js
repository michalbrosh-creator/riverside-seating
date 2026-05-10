const OFFICE_MANAGER_ID = "U0A27EZ75QS";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const webhook = process.env.VITE_SLACK_WEBHOOK_URL;
  if (!webhook) return res.status(200).end();

  const { description, createdByName, type, severity } = req.body || {};
  const typeLabel = type === "hibob" ? "HiBob" : "Facilities";
  const sevLabel = severity ? ` [${severity}]` : "";

  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `<@${OFFICE_MANAGER_ID}> New ${typeLabel} ticket${sevLabel} from ${createdByName || "someone"}: ${description}`,
    }),
  }).catch(() => {});

  return res.status(200).end();
}
