const BAR_SLACK_ID = "U0A27EZ75QS";

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function lookupSlackUserId(email) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token || !email) return null;
  const res = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);
  if (!res?.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.user?.id || null;
}

async function sendDM(userId, text) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token || !userId) return;
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ channel: userId, text }),
  }).catch(() => {});
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await getRawBody(req);
  const { employeeName, deskName, floorName, assignedByEmail, assignedByName } = JSON.parse(rawBody);

  if (assignedByEmail) {
    const assignerSlackId = await lookupSlackUserId(assignedByEmail);
    if (assignerSlackId === BAR_SLACK_ID) {
      return res.status(200).json({ skipped: true });
    }
  }

  const who = assignedByName || assignedByEmail || "Someone";
  const message = `${who} seated *${employeeName}* at ${deskName} · ${floorName} 🪑`;
  await sendDM(BAR_SLACK_ID, message);

  return res.status(200).json({ ok: true });
}
