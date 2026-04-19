import { useState, useRef, useCallback, useEffect } from "react";

function EmployeePicker({ employees, assignedIds, position, onAssign, onUnassign, currentEmployeeId, onClose }) {
  const [search, setSearch] = useState("");
  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.department || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="picker-backdrop" onClick={onClose} />
      <div className="emp-picker" style={{ top: position.y, left: position.x }}>
        <div className="picker-header">
          <input
            autoFocus
            className="picker-search"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="picker-close" onClick={onClose}>✕</button>
        </div>
        {currentEmployeeId && (
          <button className="picker-unassign" onClick={() => { onUnassign(); onClose(); }}>
            Clear seat
          </button>
        )}
        <ul className="picker-list">
          {filtered.length === 0 && <li className="picker-empty">No results</li>}
          {filtered.map((emp) => {
            const isCurrent = emp.id === currentEmployeeId;
            const isAssigned = assignedIds.has(emp.id) && !isCurrent;
            return (
              <li
                key={emp.id}
                className={`picker-item ${isCurrent ? "current" : ""} ${isAssigned ? "taken" : ""}`}
                onClick={() => { if (!isAssigned || isCurrent) { onAssign(emp.id); onClose(); } }}
              >
                <div className="emp-avatar sm">{emp.name[0]}</div>
                <div className="picker-emp-info">
                  <span className="emp-name">{emp.name}</span>
                  {emp.department && <span className="emp-dept">{emp.department}</span>}
                </div>
                {isCurrent && <span className="picker-tag current-tag">Here</span>}
                {isAssigned && <span className="picker-tag taken-tag">Seated</span>}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

function SeatCell({ seat, employee, canAssign, onSeatClick }) {
  return (
    <div
      className={`floor-seat ${employee ? "occupied" : "available"} ${canAssign && !employee ? "clickable-seat" : ""}`}
      onClick={(e) => canAssign && onSeatClick(seat, e)}
      title={!canAssign && !employee ? "" : canAssign ? "Click to assign" : undefined}
    >
      <span className="floor-seat-id">{seat.id}</span>
      {employee ? (
        <div className="seat-employee" onClick={(e) => { if (canAssign) { e.stopPropagation(); onSeatClick(seat, e); } }}>
          <span className="floor-seat-name">{employee.name.split(" ")[0]}</span>
          {canAssign && <span className="seat-edit-hint">✎</span>}
        </div>
      ) : (
        <span className="floor-seat-empty">{canAssign ? "+" : ""}</span>
      )}
    </div>
  );
}

function DeskBlock({ desk, empMap, floorId, canAssign, onSeatClick, isSelected, isHighlighted, onSelect, onDragStart, onRotateStart }) {
  const cols = Math.min(desk.size, 4);
  const occupied = desk.seats.filter((s) => s.employeeId).length;

  return (
    <div
      className={`desk-outer ${isSelected ? "selected" : ""} ${isHighlighted ? "highlighted" : ""}`}
      style={{ left: desk.x, top: desk.y, transform: `rotate(${desk.rotation}deg)` }}
      onClick={(e) => { e.stopPropagation(); onSelect(desk.label); }}
    >
      {isSelected && (
        <div
          className="rotation-handle"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onRotateStart(e, desk); }}
          title="Drag to rotate"
        >↻</div>
      )}
      <div
        className="desk-block"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDragStart(e, desk); }}
      >
        <div className="desk-block-header">
          <span className="desk-badge">{desk.label}</span>
          <span className="desk-block-title">Desk {desk.label}</span>
          <span className="desk-occupancy">{occupied}/{desk.size}</span>
          {isSelected && (
            <span className="desk-rotation-label">{Math.round(((desk.rotation % 360) + 360) % 360)}°</span>
          )}
        </div>
        <div className={`desk-seats cols-${cols}`}>
          {desk.seats.map((seat) => (
            <SeatCell
              key={seat.id}
              seat={seat}
              employee={seat.employeeId ? empMap[seat.employeeId] : null}
              canAssign={canAssign}
              onSeatClick={(s, e) => onSeatClick(s, floorId, e)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EmployeeSearch({ employees, floors, onNavigate }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Build map: employeeId → { floorId, floorName, deskLabel, seatId, deskX, deskY }
  const locationMap = {};
  floors.forEach((floor) => {
    (floor.desks || []).forEach((desk) => {
      desk.seats.forEach((seat) => {
        if (seat.employeeId) {
          locationMap[seat.employeeId] = {
            floorId: floor.id,
            floorName: floor.name,
            deskLabel: desk.label,
            seatId: seat.id,
            deskX: desk.x,
            deskY: desk.y,
          };
        }
      });
    });
  });

  const results = query.trim()
    ? employees.filter((e) =>
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        (e.department || "").toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleSelect = (emp) => {
    const loc = locationMap[emp.id];
    onNavigate(emp, loc || null);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="floor-search-wrap" ref={wrapRef}>
      <div className="floor-search-box">
        <span className="floor-search-icon">⌕</span>
        <input
          className="floor-search-input"
          placeholder="Find employee…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button className="floor-search-clear" onClick={() => { setQuery(""); setOpen(false); }}>✕</button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="floor-search-results">
          {results.map((emp) => {
            const loc = locationMap[emp.id];
            return (
              <li key={emp.id} className="floor-search-item" onClick={() => handleSelect(emp)}>
                <div className="emp-avatar sm">{emp.name[0]}</div>
                <div className="floor-search-info">
                  <span className="emp-name">{emp.name}</span>
                  {emp.department && <span className="emp-dept">{emp.department}</span>}
                </div>
                {loc ? (
                  <span className="floor-search-location">
                    <span className="location-seat">{loc.seatId}</span>
                    {floors.length > 1 && <span className="location-floor">{loc.floorName}</span>}
                  </span>
                ) : (
                  <span className="floor-search-unassigned">Not seated</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {open && query.trim() && results.length === 0 && (
        <div className="floor-search-empty">No employees found</div>
      )}
    </div>
  );
}

export default function FloorView({
  floors, activeFloorId, employees, assignedIds, canAssign,
  onSelectFloor, onAssign, onUnassign, onMoveDesk, onRotateDesk,
}) {
  const [selectedDesk, setSelectedDesk] = useState(null);
  const [highlightedDesk, setHighlightedDesk] = useState(null);
  const [deskDrag, setDeskDrag] = useState(null);
  const [deskRotate, setDeskRotate] = useState(null);
  const [picker, setPicker] = useState(null);
  const deskRefs = useRef({});
  const canvasScrollRef = useRef(null);

  const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));
  const activeFloor = floors.find((f) => f.id === activeFloorId) || floors[0];
  const activeDesks = activeFloor?.desks || [];

  const handleNavigate = useCallback((emp, loc) => {
    if (!loc) return;
    // Switch floor if needed
    if (loc.floorId !== activeFloorId) onSelectFloor(loc.floorId);
    // Scroll to desk and highlight
    setHighlightedDesk(loc.deskLabel);
    setTimeout(() => {
      if (canvasScrollRef.current) {
        canvasScrollRef.current.scrollTo({
          left: Math.max(0, loc.deskX - 200),
          top: Math.max(0, loc.deskY - 150),
          behavior: "smooth",
        });
      }
    }, 50);
    setTimeout(() => setHighlightedDesk(null), 2500);
  }, [activeFloorId, onSelectFloor]);

  const handleDeskDragStart = useCallback((e, desk) => {
    setDeskDrag({ label: desk.label, startX: e.clientX, startY: e.clientY, origX: desk.x, origY: desk.y });
  }, []);

  const handleRotateStart = useCallback((e, desk) => {
    const el = deskRefs.current[desk.label];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    setDeskRotate({ label: desk.label, cx, cy, startAngle, origRotation: desk.rotation });
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (deskDrag) {
      onMoveDesk(activeFloorId, deskDrag.label, deskDrag.origX + (e.clientX - deskDrag.startX), deskDrag.origY + (e.clientY - deskDrag.startY));
    }
    if (deskRotate) {
      const angle = Math.atan2(e.clientY - deskRotate.cy, e.clientX - deskRotate.cx) * (180 / Math.PI);
      let rotation = deskRotate.origRotation + (angle - deskRotate.startAngle);
      const snapped = Math.round(rotation / 15) * 15;
      if (Math.abs(rotation - snapped) < 4) rotation = snapped;
      onRotateDesk(activeFloorId, deskRotate.label, rotation);
    }
  }, [deskDrag, deskRotate, activeFloorId, onMoveDesk, onRotateDesk]);

  const handleMouseUp = useCallback(() => {
    setDeskDrag(null);
    setDeskRotate(null);
  }, []);

  const handleSeatClick = useCallback((seat, floorId, e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(rect.right + 8, window.innerWidth - 260);
    const y = Math.min(rect.top, window.innerHeight - 340);
    setPicker({ seatId: seat.id, floorId, currentEmpId: seat.employeeId, x, y });
  }, []);

  const isMoving = !!deskDrag || !!deskRotate;

  return (
    <div className="floor-content-full">
      <div className="floor-switcher">
        <div className="floor-switcher-tabs">
          {floors.map((floor) => (
            <button
              key={floor.id}
              className={`floor-switcher-btn ${floor.id === activeFloorId ? "active" : ""}`}
              onClick={() => onSelectFloor(floor.id)}
            >
              {floor.name}
            </button>
          ))}
        </div>
        <EmployeeSearch employees={employees} floors={floors} onNavigate={handleNavigate} />
        {!canAssign && (
          <span className="floor-lock-notice">🔒 View only</span>
        )}
      </div>

      <div
        ref={canvasScrollRef}
        className={`canvas-scroll ${isMoving ? (deskRotate ? "cursor-crosshair" : "cursor-grabbing") : ""}`}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="floor-canvas" onClick={() => setSelectedDesk(null)}>
          {activeDesks.length === 0 ? (
            <div className="canvas-empty">No desks on this floor.<br />Add them in <strong>Admin</strong>.</div>
          ) : (
            activeDesks.map((desk) => (
              <div
                key={desk.label}
                ref={(el) => { deskRefs.current[desk.label] = el; }}
                style={{ position: "absolute", left: desk.x, top: desk.y }}
              >
                <DeskBlock
                  desk={desk}
                  empMap={empMap}
                  floorId={activeFloor.id}
                  canAssign={canAssign}
                  onSeatClick={handleSeatClick}
                  isSelected={selectedDesk === desk.label}
                  isHighlighted={highlightedDesk === desk.label}
                  onSelect={setSelectedDesk}
                  onDragStart={handleDeskDragStart}
                  onRotateStart={handleRotateStart}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {picker && (
        <EmployeePicker
          employees={employees}
          assignedIds={assignedIds}
          position={{ x: picker.x, y: picker.y }}
          currentEmployeeId={picker.currentEmpId}
          onAssign={(empId) => onAssign(empId, picker.seatId, picker.floorId)}
          onUnassign={() => onUnassign(picker.seatId)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
