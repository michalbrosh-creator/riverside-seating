import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

  res.json({
    response_type: "ephemeral",
    text: `Got it! Ticket submitted ✓ _"${text}"_`,
  });

  await supabase.from("facilities_tickets").insert([{
    description: text,
    severity: "medium",
    type: "facilities",
    status: "open",
    created_by_name: userName,
    created_by_email: `${userId}@slack`,
  }]).then(({ error }) => {
    if (error) console.error("Supabase insert error", error);
  });
}
