import { useState, useEffect } from "react";
import { getTickets, markTicketDone, reopenTicket, subscribeToTickets, SEVERITIES } from "../lib/facilitiesTickets";

const SEV_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function SeverityBadge({ value }) {
  const sev = SEVERITIES.find((s) => s.value === value);
  if (!sev) return null;
  return (
    <span className="sev-badge" style={{ background: sev.bg, color: sev.color }}>
      {sev.label}
    </span>
  );
}

export default function FacilitiesTicketsAdmin({ userEmail }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");

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

  const sorted = [...tickets].sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    const sevDiff = (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9);
    return sevDiff !== 0 ? sevDiff : new Date(b.created_at) - new Date(a.created_at);
  });

  const filtered = filter === "all" ? sorted : sorted.filter((t) => t.status === filter);
  const openCount = tickets.filter((t) => t.status === "open").length;
  const doneCount = tickets.filter((t) => t.status === "done").length;

  const handleDone = async (id) => {
    await markTicketDone(id, userEmail);
    load();
  };

  const handleReopen = async (id) => {
    await reopenTicket(id);
    load();
  };

  return (
    <div className="admin-tab">
      <div className="admin-section">
        <div className="section-header">
          <div className="section-header-left">
            <h2>Facilities Tickets</h2>
            <span className="section-meta">{openCount} open · {doneCount} resolved</span>
          </div>
        </div>

        <div className="ticket-filters">
          {[
            { key: "open", label: "Open",     count: openCount },
            { key: "done", label: "Done",      count: doneCount },
            { key: "all",  label: "All",       count: tickets.length },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              className={`ticket-filter-btn ${filter === key ? "active" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
              <span className="ticket-filter-count">{count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty-hint padded">Loading tickets…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-hint padded">
            {filter === "open" ? "No open tickets." : filter === "done" ? "No resolved tickets yet." : "No tickets yet."}
          </div>
        ) : (
          <div className="ticket-list">
            {filtered.map((ticket) => (
              <div key={ticket.id} className={`ticket-card ${ticket.status === "done" ? "done" : ""}`}>
                <div className="ticket-card-top">
                  <SeverityBadge value={ticket.severity} />
                  <span className="ticket-date">{formatDate(ticket.created_at)}</span>
                  <div className="ticket-card-actions">
                    {ticket.status === "open" ? (
                      <button className="btn-primary sm" onClick={() => handleDone(ticket.id)}>
                        Mark Done
                      </button>
                    ) : (
                      <button className="btn-secondary sm" onClick={() => handleReopen(ticket.id)}>
                        Reopen
                      </button>
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
