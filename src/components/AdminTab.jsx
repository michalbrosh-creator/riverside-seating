import { useState, useRef } from "react";

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const nameIdx = header.findIndex((h) => h.includes("name"));
  const deptIdx = header.findIndex((h) => h.includes("dep") || h.includes("team") || h.includes("role"));
  const emailIdx = header.findIndex((h) => h.includes("email") || h.includes("mail"));
  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      return {
        name: nameIdx >= 0 ? cols[nameIdx] : cols[0],
        department: deptIdx >= 0 ? cols[deptIdx] : cols[1] || "",
        email: emailIdx >= 0 ? cols[emailIdx] : "",
      };
    })
    .filter((e) => e.name);
}

function EmployeeTable({ employees, onRemove, onToggleAdmin }) {
  const [search, setSearch] = useState("");
  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.department || "").toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="emp-table-wrapper">
      <div className="emp-table-toolbar">
        <input className="emp-search" type="text" placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className="emp-count">{employees.length} employee{employees.length !== 1 ? "s" : ""}</span>
      </div>
      {filtered.length === 0 ? (
        <p className="empty-hint padded">{employees.length === 0 ? "No employees yet. Add one above or import a CSV." : "No results."}</p>
      ) : (
        <table className="emp-table">
          <thead>
            <tr><th></th><th>Name</th><th>Department</th><th>Admin</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((emp) => (
              <tr key={emp.id} className={emp.isAdmin ? "admin-row" : ""}>
                <td><div className="emp-avatar sm">{emp.name[0]}</div></td>
                <td className="emp-name-cell">
                  {emp.name}
                  {emp.isAdmin && <span className="admin-badge">Admin</span>}
                </td>
                <td className="emp-dept-cell">{emp.department || <span className="no-value">—</span>}</td>
                <td>
                  <label className="toggle" title={emp.isAdmin ? "Revoke admin" : "Grant admin"}>
                    <input type="checkbox" checked={!!emp.isAdmin} onChange={() => onToggleAdmin(emp.id)} />
                    <span className="toggle-slider" />
                  </label>
                </td>
                <td><button className="btn-icon-danger" onClick={() => onRemove(emp.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AdminTab({
  floors, activeFloorId, employees, deskSizes,
  onSelectFloor, onAddFloor, onRenameFloor, onRemoveFloor,
  onAddDesk, onRemoveDesk,
  onAddEmployee, onRemoveEmployee, onToggleAdmin, onImportEmployees,
  onAssignSeat, onUnassignSeat, canAssign,
}) {
  const [selectedSize, setSelectedSize] = useState(4);
  const [empName, setEmpName] = useState("");
  const [empDept, setEmpDept] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [editingFloorId, setEditingFloorId] = useState(null);
  const [editingFloorName, setEditingFloorName] = useState("");
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");
  const fileInputRef = useRef();

  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const allDesks = activeFloor?.desks || [];
  const assignedAnywhere = new Set(
    floors.flatMap((f) => (f.desks || []).flatMap((d) => d.seats.filter((s) => s.employeeId).map((s) => s.employeeId)))
  );
  const empById = Object.fromEntries(employees.map((e) => [e.id, e]));

  const handleAddEmployee = () => {
    if (!empName.trim()) return;
    onAddEmployee(empName.trim(), empDept.trim(), empEmail.trim());
    setEmpName(""); setEmpDept(""); setEmpEmail("");
  };

  const startFloorRename = (floor) => { setEditingFloorId(floor.id); setEditingFloorName(floor.name); };
  const commitFloorRename = () => { if (editingFloorName.trim()) onRenameFloor(editingFloorId, editingFloorName.trim()); setEditingFloorId(null); };

  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportError(""); setImportSuccess("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target.result);
        if (!parsed.length) { setImportError("No valid rows found. Make sure the CSV has a Name column."); return; }
        onImportEmployees(parsed);
        setImportSuccess(`Imported ${parsed.length} employee${parsed.length !== 1 ? "s" : ""}.`);
        setTimeout(() => setImportSuccess(""), 3000);
      } catch { setImportError("Failed to parse CSV."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="admin-tab">

      {/* ── Floors ── */}
      <section className="admin-section">
        <div className="section-header">
          <h2>Floors</h2>
          <button className="btn-primary" onClick={onAddFloor}>+ Add Floor</button>
        </div>
        <div className="floor-tabs-admin">
          {floors.map((floor) => (
            <div key={floor.id} className={`floor-tab-item ${floor.id === activeFloorId ? "active" : ""}`}>
              {editingFloorId === floor.id ? (
                <input autoFocus className="floor-name-input" value={editingFloorName}
                  onChange={(e) => setEditingFloorName(e.target.value)}
                  onBlur={commitFloorRename} onKeyDown={(e) => e.key === "Enter" && commitFloorRename()} />
              ) : (
                <span className="floor-tab-name" onClick={() => onSelectFloor(floor.id)}>{floor.name}</span>
              )}
              <button className="icon-btn" title="Rename" onClick={() => startFloorRename(floor)}>✎</button>
              {floors.length > 1 && (
                <button className="icon-btn danger" title="Remove" onClick={() => onRemoveFloor(floor.id)}>✕</button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Desks ── */}
      <section className="admin-section">
        <div className="section-header">
          <h2>Desks — {activeFloor?.name}</h2>
          <div className="create-desk">
            <div className="size-options">
              {deskSizes.map((s) => (
                <button key={s} className={`size-btn ${selectedSize === s ? "active" : ""}`} onClick={() => setSelectedSize(s)}>{s}</button>
              ))}
            </div>
            <button className="btn-primary sm" onClick={() => onAddDesk(activeFloorId, selectedSize)}>
              + Add Desk
            </button>
          </div>
        </div>

        {allDesks.length === 0 ? (
          <p className="empty-hint padded">No desks on this floor yet.</p>
        ) : (
          <div className="desk-list">
            {allDesks.map((desk) => {
              const occupied = desk.seats.filter((s) => s.employeeId).length;
              return (
                <div key={desk.label} className="desk-card">
                  <div className="desk-card-header">
                    <span className="desk-badge">{desk.label}</span>
                    <span className="desk-info">Desk {desk.label} — {occupied}/{desk.size} occupied</span>
                    <button className="btn-danger" onClick={() => onRemoveDesk(activeFloorId, desk.label)}>Remove</button>
                  </div>
                  <div className="desk-seat-assignments">
                    {desk.seats.map((seat) => {
                      const assigned = seat.employeeId ? empById[seat.employeeId] : null;
                      return (
                        <div key={seat.id} className="seat-assignment-row">
                          <span className="seat-label-tag">{seat.id}</span>
                          {canAssign ? (
                            <select
                              className="seat-emp-select"
                              value={seat.employeeId ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!val) onUnassignSeat(seat.id);
                                else onAssignSeat(Number(val), seat.id, activeFloorId);
                              }}
                            >
                              <option value="">— Empty —</option>
                              {employees.map((emp) => {
                                const takenElsewhere = assignedAnywhere.has(emp.id) && emp.id !== seat.employeeId;
                                return (
                                  <option key={emp.id} value={emp.id} disabled={takenElsewhere}>
                                    {emp.name}{emp.department ? ` (${emp.department})` : ""}{takenElsewhere ? " — seated" : ""}
                                  </option>
                                );
                              })}
                            </select>
                          ) : (
                            <span className="seat-emp-readonly">{assigned ? assigned.name : <span className="no-value">Empty</span>}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Employees ── */}
      <section className="admin-section">
        <div className="section-header">
          <h2>Employees</h2>
          <div className="emp-actions">
            <div className="add-employee-form">
              <input className="emp-input" type="text" placeholder="Name" value={empName}
                onChange={(e) => setEmpName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddEmployee()} />
              <input className="emp-input" type="text" placeholder="Department" value={empDept}
                onChange={(e) => setEmpDept(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddEmployee()} />
              <input className="emp-input" type="email" placeholder="Email (for SSO)" value={empEmail}
                onChange={(e) => setEmpEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddEmployee()} />
              <button className="btn-primary" onClick={handleAddEmployee}>+ Add</button>
            </div>
            <div className="import-area">
              <button className="btn-secondary" onClick={() => fileInputRef.current.click()}>Import CSV</button>
              <input ref={fileInputRef} type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFileImport} />
              <span className="import-hint">Name, Department, Email columns</span>
            </div>
          </div>
        </div>
        {importError && <div className="import-msg error">{importError}</div>}
        {importSuccess && <div className="import-msg success">{importSuccess}</div>}
        <EmployeeTable employees={employees} onRemove={onRemoveEmployee} onToggleAdmin={onToggleAdmin} />
      </section>
    </div>
  );
}
