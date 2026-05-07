import { useState } from "react";
import { createTicket, SEVERITIES } from "../lib/facilitiesTickets";

export default function FacilitiesTicketModal({ userEmail, userName, onClose }) {
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError("");
    const { error: err } = await createTicket({
      description,
      severity,
      createdByEmail: userEmail,
      createdByName: userName,
    });
    setLoading(false);
    if (err) {
      setError("Failed to submit ticket. Please try again.");
    } else {
      setSubmitted(true);
      setTimeout(onClose, 1800);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()} onKeyDown={handleKeyDown}>
      <div className="modal-card">
        <div className="modal-header">
          <h2>Facilities Ticket</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {submitted ? (
          <div className="modal-success">
            <div className="modal-success-icon">✓</div>
            <p>Ticket submitted! We'll get on it.</p>
          </div>
        ) : (
          <>
            <div className="modal-body">
              <label className="modal-label">Severity</label>
              <div className="severity-options">
                {SEVERITIES.map((s) => (
                  <button
                    key={s.value}
                    className={`severity-btn ${severity === s.value ? "active" : ""}`}
                    style={severity === s.value ? { background: s.bg, color: s.color, borderColor: s.color } : {}}
                    onClick={() => setSeverity(s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <label className="modal-label">Description</label>
              <textarea
                className="modal-textarea"
                placeholder="Describe the issue or request…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                autoFocus
              />

              {error && <div className="modal-error">{error}</div>}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={!description.trim() || loading}
              >
                {loading ? "Submitting…" : "Submit Ticket"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
