export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const userId = process.env.HIBOB_SERVICE_USER_ID;
  const token = process.env.HIBOB_SERVICE_USER_TOKEN;
  if (!userId || !token) return res.status(500).json({ error: "HiBob credentials not configured" });

  const auth = Buffer.from(`${userId}:${token}`).toString("base64");

  const hibobRes = await fetch("https://api.hibob.com/v1/people", {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  }).catch(() => null);

  if (!hibobRes || !hibobRes.ok) {
    const text = await hibobRes?.text().catch(() => "");
    console.error("HiBob API error:", hibobRes?.status, text);
    return res.status(500).json({ error: "Failed to fetch from HiBob" });
  }

  const data = await hibobRes.json();
  const employees = (data.employees || [])
    .filter((e) => e.email)
    .map((e) => ({
      name: [e.firstName, e.lastName].filter(Boolean).join(" "),
      email: e.email.toLowerCase(),
      department: e.work?.department || "",
    }));

  return res.status(200).json({ employees });
}
