export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const userId = (process.env.HIBOB_SERVICE_USER_ID || "").trim();
  const token = (process.env.HIBOB_SERVICE_USER_TOKEN || "").trim();
  if (!userId || !token) return res.status(500).json({ error: "HiBob credentials not configured" });

  const auth = Buffer.from(`${userId}:${token}`).toString("base64");

  const hibobRes = await fetch("https://api.hibob.com/v1/people/search", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  }).catch(() => null);

  if (!hibobRes) return res.status(500).json({ error: "HiBob request failed" });

  const text = await hibobRes.text().catch(() => "");

  if (!hibobRes.ok || text.trim().startsWith("<")) {
    return res.status(500).json({ error: `HiBob error ${hibobRes.status}: ${text.slice(0, 100)}` });
  }

  const data = JSON.parse(text);
  const employees = (data.employees || [])
    .filter((e) => e.email && (e.work?.site || "").startsWith("Israel"))
    .map((e) => ({
      name: e.displayName || [e.firstName, e.surname].filter(Boolean).join(" "),
      email: e.email.toLowerCase(),
      department: e.work?.department || "",
    }));

  return res.status(200).json({ employees });
}
