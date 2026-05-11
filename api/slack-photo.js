export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const email = req.query.email;
  if (!email) return res.status(400).json({ photoUrl: null });

  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return res.status(200).json({ photoUrl: null, debug: "no token" });

  const slackRes = await fetch(
    `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  ).catch(() => null);

  if (!slackRes) return res.status(200).json({ photoUrl: null, debug: "fetch failed" });
  const data = await slackRes.json().catch(() => null);
  const photoUrl = data?.ok ? (data.user?.profile?.image_72 || null) : null;
  if (!photoUrl) return res.status(200).json({ photoUrl: null, debug: data?.error || "no photo", ok: data?.ok });

  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.status(200).json({ photoUrl });
}
