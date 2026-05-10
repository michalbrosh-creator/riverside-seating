export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const hasUrl = !!process.env.SUPABASE_URL;
  const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  return res.json({
    response_type: "ephemeral",
    text: `Debug: SUPABASE_URL=${hasUrl} SUPABASE_SERVICE_ROLE_KEY=${hasKey}`,
  });
}
