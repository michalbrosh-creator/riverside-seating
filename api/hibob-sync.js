export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const userId = process.env.HIBOB_SERVICE_USER_ID;
  const token = process.env.HIBOB_SERVICE_USER_TOKEN;
  if (!userId || !token) return res.status(500).json({ error: "HiBob credentials not configured" });

  const auth = Buffer.from(`${userId}:${token}`).toString("base64");
  console.log("HiBob userId:", userId, "token length:", token.length, "auth header:", `Basic ${auth}`.slice(0, 20) + "...");

  const hibobRes = await fetch("https://api.hibob.com/v1/people", {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  }).catch(() => null);

  const text = await hibobRes.text().catch(() => "");
  console.log("HiBob status:", hibobRes.status, "body start:", text.slice(0, 200));

  if (!hibobRes.ok || text.trim().startsWith("<")) {
    return res.status(500).json({ error: `HiBob error ${hibobRes.status}: ${text.slice(0, 100)}` });
  }

  const data = JSON.parse(text);
  const employees = (data.employees || [])
    .filter((e) => e.email)
    .map((e) => ({
      name: [e.firstName, e.lastName].filter(Boolean).join(" "),
      email: e.email.toLowerCase(),
      department: e.work?.department || "",
    }));

  return res.status(200).json({ employees });
}
