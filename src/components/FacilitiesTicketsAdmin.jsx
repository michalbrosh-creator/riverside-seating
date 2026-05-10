import { useState, useEffect } from "react";
import { getTickets, markTicketDone, reopenTicket, subscribeToTickets, SEVERITIES } from "../lib/facilitiesTickets";

const SEV_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

const TYPE_LABELS = { facilities: "Facilities", hibob: "HiBob" };
const TYPE_STYLE = {
  facilities: { background: "#f0fdf4", color: "#15803d" },
  hibob:      { background: "#eff6ff", color: "#1d4ed8" },
};

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function SeverityBadge({ value }) {
  const sev = SEVERITIES.find((s) => s.value === value);
  if (!sev) return null;
  return <span className="sev-badge" style={{ background: sev.bg, color: sev.color }}>{sev.label}</span>;
}

function TypeBadge({ value }) {
  const style = TYPE_STYLE[value] || {};
  return <span className="sev-badge" style={style}>{TYPE_LABELS[value] || value}</span>;
}

export default function FacilitiesTicketsAdmin({ userEmail }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");

  const load = async () => {
    const { data } = await getTickets();
    if (data) setTickets(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const unsub = subscribeToTickets(load);
    return unsub;
  }, []);

  const byType = typeFilter === "all" ? tickets : tickets.filter((t) => t.type === typeFilter);
  const sorted = [...byType].sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    const sevDiff = (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9);
    return sevDiff !== 0 ? sevDiff : new Date(b.created_at) - new Date(a.created_at);
  });
  const filtered = statusFilter === "all" ? sorted : sorted.filter((t) => t.status === statusFilter);

  const openCount = byType.filter((t) => t.status === "open").length;
  const doneCount = byType.filter((t) => t.status === "done").length;

  const handleDone = async (id) => { await markTicketDone(id, userEmail); load(); };
  const handleReopen = async (id) => { await reopenTicket(id); load(); };

  return (
    <div className="admin-tab">
      <div className="admin-section">
        <div className="section-header">
          <div className="section-header-left">
            <h2>Tickets</h2>
            <span className="section-meta">{openCount} open · {doneCount} resolved</span>
          </div>
        </div>

        <div className="ticket-filters" style={{ borderBottom: "none", paddingBottom: 0 }}>
          {[
            { key: "all",        label: "All",        count: tickets.length },
            { key: "facilities", label: "Facilities",  count: tickets.filter((t) => t.type === "facilities").length },
            { key: "hibob",      label: "HiBob",       count: tickets.filter((t) => t.type === "hibob").length },
          ].map(({ key, label, count }) => (
            <button key={key} className={`ticket-filter-btn ${typeFilter === key ? "active" : ""}`} onClick={() => setTypeFilter(key)}>
              {label}<span className="ticket-filter-count">{count}</span>
            </button>
          ))}
        </div>

        <div className="ticket-filters">
          {[
            { key: "open", label: "Open", count: openCount },
            { key: "done", label: "Done", count: doneCount },
            { key: "all",  label: "All",  count: byType.length },
          ].map(({ key, label, count }) => (
            <button key={key} className={`ticket-filter-btn ${statusFilter === key ? "active" : ""}`} onClick={() => setStatusFilter(key)}>
              {label}<span className="ticket-filter-count">{count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty-hint padded">Loading tickets…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-hint padded">No tickets found.</div>
        ) : (
          <div className="ticket-list">
            {filtered.map((ticket) => (
              <div key={ticket.id} className={`ticket-card ${ticket.status === "done" ? "done" : ""}`}>
                <div className="ticket-card-top">
                  <TypeBadge value={ticket.type} />
                  {ticket.severity && <SeverityBadge value={ticket.severity} />}
                  <span className="ticket-date">{formatDate(ticket.created_at)}</span>
                  <div className="ticket-card-actions">
                    {ticket.status === "open" ? (
                      <button className="btn-primary sm" onClick={() => handleDone(ticket.id)}>Mark Done</button>
                    ) : (
                      <button className="btn-secondary sm" onClick={() => handleReopen(ticket.id)}>Reopen</button>
                    )}
                  </div>
                </div>
                <p className="ticket-description">{ticket.description}</p>
                <div className="ticket-meta">
                  <span className="ticket-submitter">
                    {ticket.created_by_name || ticket.created_by_email}
                    {ticket.created_by_email && ticket.created_by_name && (
                      <span className="ticket-email"> · {ticket.created_by_email}</span>
                    )}
                  </span>
                  {ticket.status === "done" && ticket.resolved_by && (
                    <span className="ticket-resolved">Resolved by {ticket.resolved_by}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
