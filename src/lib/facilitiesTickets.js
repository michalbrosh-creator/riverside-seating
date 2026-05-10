import { supabase } from "./supabase";

export const SEVERITIES = [
  { value: "low",    label: "Low",    bg: "#dcfce7", color: "#15803d" },
  { value: "medium", label: "Medium", bg: "#fef9c3", color: "#a16207" },
  { value: "high",   label: "High",   bg: "#fee2e2", color: "#b91c1c" },
  { value: "urgent", label: "Urgent", bg: "#f3e8ff", color: "#7e22ce" },
];

const LS_KEY = "facilities_tickets";
const lsRead = () => JSON.parse(localStorage.getItem(LS_KEY) || "[]");
const lsWrite = (t) => localStorage.setItem(LS_KEY, JSON.stringify(t));

async function notifySlack(ticket) {
  await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description: ticket.description,
      createdByName: ticket.created_by_name || ticket.created_by_email,
      type: ticket.type,
      severity: ticket.severity,
    }),
  }).catch(() => {});
}

export async function createTicket({ description, severity, type = "facilities", createdByEmail, createdByName }) {
  const payload = {
    description: description.trim(),
    severity: severity || null,
    type,
    status: "open",
    created_by_email: createdByEmail,
    created_by_name: createdByName,
  };

  if (!supabase) {
    const ticket = { ...payload, id: Date.now(), created_at: new Date().toISOString() };
    lsWrite([...lsRead(), ticket]);
    await notifySlack(ticket);
    return { data: ticket, error: null };
  }

  const { data, error } = await supabase
    .from("facilities_tickets")
    .insert([payload])
    .select()
    .single();

  if (data) await notifySlack(data);
  return { data, error };
}

export async function getTickets() {
  if (!supabase) {
    return { data: lsRead(), error: null };
  }
  return supabase
    .from("facilities_tickets")
    .select("*")
    .order("created_at", { ascending: false });
}

export async function markTicketDone(id, resolvedByEmail) {
  if (!supabase) {
    lsWrite(
      lsRead().map((t) =>
        t.id === id
          ? { ...t, status: "done", resolved_at: new Date().toISOString(), resolved_by: resolvedByEmail }
          : t
      )
    );
    return { error: null };
  }
  return supabase
    .from("facilities_tickets")
    .update({ status: "done", resolved_at: new Date().toISOString(), resolved_by: resolvedByEmail })
    .eq("id", id);
}

export async function reopenTicket(id) {
  if (!supabase) {
    lsWrite(
      lsRead().map((t) =>
        t.id === id ? { ...t, status: "open", resolved_at: null, resolved_by: null } : t
      )
    );
    return { error: null };
  }
  return supabase
    .from("facilities_tickets")
    .update({ status: "open", resolved_at: null, resolved_by: null })
    .eq("id", id);
}

export async function deleteTicket(id) {
  if (!supabase) {
    lsWrite(lsRead().filter((t) => t.id !== id));
    return { error: null };
  }
  return supabase.from("facilities_tickets").delete().eq("id", id);
}

export function subscribeToTickets(callback) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("facilities_tickets_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "facilities_tickets" }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
