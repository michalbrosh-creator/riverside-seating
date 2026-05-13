import { supabase } from "./supabase";

export const SEVERITIES = [
  { value: "low",    label: "Low",    bg: "#dcfce7", color: "#15803d" },
  { value: "medium", label: "Medium", bg: "#fef9c3", color: "#a16207" },
  { value: "high",   label: "High",   bg: "#fee2e2", color: "#b91c1c" },
  { value: "urgent", label: "Urgent", bg: "#f3e8ff", color: "#7e22ce" },
];

const lsRead = (key) => JSON.parse(localStorage.getItem(key) || "[]");
const lsWrite = (key, t) => localStorage.setItem(key, JSON.stringify(t));

async function notifySlack(ticket) {
  await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description: ticket.description,
      createdByName: ticket.created_by_name || ticket.created_by_email,
      createdByEmail: ticket.created_by_email,
      type: ticket.type,
      severity: ticket.severity,
    }),
  }).catch(() => {});
}

export async function createTicket({ description, severity, type = "facilities", createdByEmail, createdByName }) {
  const isHibob = type === "hibob";
  const table = isHibob ? "hibob_tickets" : "facilities_tickets";
  const payload = {
    description: description.trim(),
    status: "open",
    created_by_email: createdByEmail,
    created_by_name: createdByName,
    ...(!isHibob ? { severity: severity || null } : {}),
  };

  if (!supabase) {
    const ticket = { ...payload, type, id: Date.now(), created_at: new Date().toISOString() };
    lsWrite(table, [...lsRead(table), ticket]);
    await notifySlack(ticket);
    return { data: ticket, error: null };
  }

  const { data, error } = await supabase.from(table).insert([payload]).select().single();
  await notifySlack({ ...payload, type });
  return { data: data ? { ...data, type } : null, error };
}

export async function getTickets() {
  if (!supabase) {
    const facilities = lsRead("facilities_tickets").map((t) => ({ ...t, type: "facilities" }));
    const hibob = lsRead("hibob_tickets").map((t) => ({ ...t, type: "hibob" }));
    return {
      data: [...facilities, ...hibob].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      error: null,
    };
  }
  const [fRes, hRes] = await Promise.all([
    supabase.from("facilities_tickets").select("*"),
    supabase.from("hibob_tickets").select("*"),
  ]);
  const facilities = (fRes.data || []).map((t) => ({ ...t, type: "facilities" }));
  const hibob = (hRes.data || []).map((t) => ({ ...t, type: "hibob" }));
  return {
    data: [...facilities, ...hibob].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    error: fRes.error || hRes.error,
  };
}

export async function markTicketDone(id, resolvedByEmail, type = "facilities") {
  const table = type === "hibob" ? "hibob_tickets" : "facilities_tickets";
  const update = { status: "done", resolved_at: new Date().toISOString(), resolved_by: resolvedByEmail };
  if (!supabase) {
    lsWrite(table, lsRead(table).map((t) => (t.id === id ? { ...t, ...update } : t)));
    return { error: null };
  }
  return supabase.from(table).update(update).eq("id", id);
}

export async function reopenTicket(id, type = "facilities") {
  const table = type === "hibob" ? "hibob_tickets" : "facilities_tickets";
  const update = { status: "open", resolved_at: null, resolved_by: null };
  if (!supabase) {
    lsWrite(table, lsRead(table).map((t) => (t.id === id ? { ...t, ...update } : t)));
    return { error: null };
  }
  return supabase.from(table).update(update).eq("id", id);
}

export async function deleteTicket(id, type = "facilities") {
  const table = type === "hibob" ? "hibob_tickets" : "facilities_tickets";
  if (!supabase) {
    lsWrite(table, lsRead(table).filter((t) => t.id !== id));
    return { error: null };
  }
  return supabase.from(table).delete().eq("id", id);
}

export function subscribeToTickets(callback) {
  if (!supabase) return () => {};
  const ch1 = supabase.channel("facilities_tickets_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "facilities_tickets" }, callback)
    .subscribe();
  const ch2 = supabase.channel("hibob_tickets_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "hibob_tickets" }, callback)
    .subscribe();
  return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
}
