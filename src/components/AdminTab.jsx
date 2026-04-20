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
        <div className="search-field">
          <span className="search-icon">⌕</span>
          <input className="emp-search" type="text" placeholder="Search employees…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="emp-count">{employees.length} employee{employees.length !== 1 ? "s" : ""}</span>
      </div>
      {filtered.length === 0 ? (
        <div className="empty-hint padded">{employees.length === 0 ? "No employees yet. Add one above or import a CSV." : "No results."}</div>
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
  floorImages, onSetFloorImage, onClearFloorImage,
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
  const imageInputRef = useRef();
  const [uploadingFloorId, setUploadingFloorId] = useState(null);

  const startImageUpload = (floorId) => {
    setUploadingFloorId(floorId);
    imageInputRef.current.click();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !uploadingFloorId) return;
    const reader = new FileReader();
    reader.onload = (ev) => onSetFloorImage(uploadingFloorId, ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
    setUploadingFloorId(null);
  };

  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const allDesks = activeFloor?.desks || [];

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
        if (!parsed.length) { setImportError("No valid rows found in CSV. Make sure there is a Name column."); return; }
        onImportEmployees(parsed);
        setImportSuccess(`Imported ${parsed.length} employee${parsed.length !== 1 ? "s" : ""} successfully.`);
        setTimeout(() => setImportSuccess(""), 4000);
      } catch { setImportError("Failed to parse CSV file."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="admin-tab">

      {/* ── Floors ── */}
      <section className="admin-section">
        <div className="section-header">
          <div className="section-header-left">
            <h2>Floors</h2>
            <span className="section-meta">{floors.length} floor{floors.length !== 1 ? "s" : ""}</span>
          </div>
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
              <button
                className={`icon-btn ${floorImages?.[floor.id] ? "has-image" : ""}`}
                title={floorImages?.[floor.id] ? "Change layout image" : "Upload layout image"}
                onClick={() => startImageUpload(floor.id)}
              >⊕</button>
              {floorImages?.[floor.id] && (
                <button className="icon-btn danger" title="Remove layout image" onClick={() => onClearFloorImage(floor.id)}>✕ img</button>
              )}
              {floors.length > 1 && (
                <button className="icon-btn danger" title="Remove floor" onClick={() => onRemoveFloor(floor.id)}>✕</button>
              )}
            </div>
          ))}
        </div>
        <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
      </section>

      {/* ── Desks ── */}
      <section className="admin-section">
        <div className="section-header">
          <div className="section-header-left">
            <h2>Desks</h2>
            <span className="section-meta">{activeFloor?.name} · {allDesks.length} desk{allDesks.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="desk-toolbar">
          <span className="toolbar-label">Seats per desk</span>
          <div className="size-options">
            {deskSizes.map((s) => (
              <button key={s} className={`size-btn ${selectedSize === s ? "active" : ""}`} onClick={() => setSelectedSize(s)}>{s}</button>
            ))}
          </div>
          <button className="btn-primary sm" onClick={() => onAddDesk(activeFloorId, selectedSize)}>+ Add Desk</button>
        </div>

        {allDesks.length === 0 ? (
          <div className="empty-hint padded">No desks on this floor yet. Use the toolbar above to add one.</div>
        ) : (
          <div className="desk-list">
            {allDesks.map((desk) => {
              const occupied = desk.seats.filter((s) => s.employeeId).length;
              const pct = Math.round((occupied / desk.size) * 100);
              return (
                <div key={desk.label} className="desk-card">
                  <div className="desk-card-header">
                    <span className="desk-badge">{desk.label}</span>
                    <div className="desk-card-info">
                      <span className="desk-card-title">Desk {desk.label}</span>
                      <div className="desk-occupancy-bar">
                        <div className="desk-occupancy-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="desk-card-count">{occupied}/{desk.size} seats</span>
                    <button className="btn-danger sm" onClick={() => onRemoveDesk(activeFloorId, desk.label)}>Remove</button>
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
          <div className="section-header-left">
            <h2>Employees</h2>
            <span className="section-meta">{employees.length} total</span>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => fileInputRef.current.click()}>↑ Import CSV</button>
            <input ref={fileInputRef} type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFileImport} />
          </div>
        </div>

        <div className="emp-add-panel">
          <input className="emp-input" type="text" placeholder="Full name" value={empName}
            onChange={(e) => setEmpName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddEmployee()} />
          <input className="emp-input" type="text" placeholder="Department" value={empDept}
            onChange={(e) => setEmpDept(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddEmployee()} />
          <input className="emp-input" type="email" placeholder="Email (for SSO login)" value={empEmail}
            onChange={(e) => setEmpEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddEmployee()} />
          <button className="btn-primary" onClick={handleAddEmployee} disabled={!empName.trim()}>Add Employee</button>
        </div>

        {importError && <div className="import-msg error">{importError}</div>}
        {importSuccess && <div className="import-msg success">{importSuccess}</div>}
        <EmployeeTable employees={employees} onRemove={onRemoveEmployee} onToggleAdmin={onToggleAdmin} />
      </section>

    </div>
  );
}
