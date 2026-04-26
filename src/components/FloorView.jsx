import { useState, useRef, useCallback, useEffect } from "react";

function EmployeePicker({ employees, assignedIds, position, onAssign, onUnassign, currentEmployeeId, onClose, seatLabel }) {
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
          {seatLabel && <span className="picker-seat-label">{seatLabel}</span>}
          <div>
            <input
              autoFocus
              className="picker-search"
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="picker-close" onClick={onClose}>✕</button>
          </div>
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

function SeatCell({ seat, employee, canAssign, onSeatClick, onUnassign, onToggleSeatDisabled }) {
  const isDisabled = !!seat.disabled;
  const clickable = canAssign && !employee && !isDisabled;

  return (
    <div
      className={`floor-seat ${isDisabled ? "disabled" : employee ? "occupied" : "available"} ${clickable ? "clickable-seat" : ""}`}
      onClick={(e) => clickable && onSeatClick(seat, e)}
      title={isDisabled ? "Seat disabled" : clickable ? "Click to assign" : undefined}
    >
      <span className="floor-seat-id">{seat.label}</span>
      {isDisabled ? (
        <span className="floor-seat-disabled-label">N/A</span>
      ) : employee ? (
        <div className="seat-employee" onClick={(e) => { if (canAssign) { e.stopPropagation(); onSeatClick(seat, e); } }}>
          <span className="floor-seat-name">{employee.name.split(" ")[0]}</span>
          {canAssign && <span className="seat-edit-hint">✎</span>}
        </div>
      ) : (
        <span className="floor-seat-empty">{canAssign ? "+" : ""}</span>
      )}
      {canAssign && employee && (
        <button
          className="seat-unassign-btn"
          title="Remove from seat"
          onClick={(e) => { e.stopPropagation(); onUnassign(seat.id); }}
        >✕</button>
      )}
      {canAssign && !employee && (
        <button
          className={`seat-toggle-btn ${isDisabled ? "seat-enable-btn" : "seat-disable-btn"}`}
          title={isDisabled ? "Re-enable seat" : "Disable seat"}
          onClick={(e) => { e.stopPropagation(); onToggleSeatDisabled(seat.id); }}
        >{isDisabled ? "✓" : "−"}</button>
      )}
    </div>
  );
}

function DeskBlock({ desk, empMap, floorId, canAssign, onSeatClick, onUnassign, onToggleSeatDisabled, isSelected, isHighlighted, onSelect, onDragStart, onRotateClick, onResizeDesk, onRenameDesk }) {
  const cols = desk.size === 6 ? 3 : desk.size === 4 ? 2 : Math.min(desk.size, 4);
  const occupied = desk.seats.filter((s) => s.employeeId).length;
  const displayRotation = Math.round(((desk.rotation % 360) + 360) % 360);
  const deskName = desk.name || desk.label;
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(deskName);

  const commitName = () => {
    const trimmed = nameVal.trim();
    if (trimmed && trimmed !== deskName) onRenameDesk(desk, trimmed);
    else setNameVal(deskName);
    setEditingName(false);
  };

  return (
    <div
      className={`desk-outer ${isSelected ? "selected" : ""} ${isHighlighted ? "highlighted" : ""}`}
      style={{ left: desk.x, top: desk.y, transform: `rotate(${desk.rotation}deg)` }}
      onClick={(e) => { e.stopPropagation(); onSelect(desk.label); }}
    >
      {isSelected && (
        <button
          className="rotation-handle"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRotateClick(desk); }}
          title="Click to rotate 90°"
        >↻</button>
      )}
      <div
        className="desk-block"
        data-desk-label={desk.label}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDragStart(e, desk); }}
      >
        <div className="desk-block-header">
          {editingName ? (
            <input
              className="desk-name-input"
              value={nameVal}
              autoFocus
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setNameVal(deskName); setEditingName(false); } }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="desk-block-title"
              title="Double-click to rename"
              onDoubleClick={(e) => { e.stopPropagation(); setNameVal(deskName); setEditingName(true); }}
            >{deskName}</span>
          )}
          <span className="desk-occupancy">{occupied}/{desk.size}</span>
          {isSelected && (
            <span className="desk-rotation-label">{displayRotation}°</span>
          )}
        </div>
        {isSelected && (
          <div className="desk-resize-bar">
            <span className="desk-resize-label">Seats:</span>
            {RESIZE_OPTIONS.filter((s) => s !== desk.size).map((s) => (
              <button
                key={s}
                className="desk-resize-btn"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onResizeDesk(desk, s); }}
              >{s}</button>
            ))}
          </div>
        )}
        <div className={`desk-seats cols-${cols}`}>
          {desk.seats.map((seat) => (
            <SeatCell
              key={seat.id}
              seat={seat}
              employee={seat.employeeId ? empMap[seat.employeeId] : null}
              canAssign={canAssign}
              onSeatClick={(s, e) => onSeatClick(s, floorId, e)}
              onUnassign={onUnassign}
              onToggleSeatDisabled={onToggleSeatDisabled}
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

  const locationMap = {};
  floors.forEach((floor) => {
    (floor.desks || []).forEach((desk) => {
      desk.seats.forEach((seat) => {
        if (seat.employeeId) {
          locationMap[seat.employeeId] = {
            floorId: floor.id,
            floorName: floor.name,
            deskLabel: desk.label,
            deskName: desk.name || desk.label,
            seatNumber: seat.label,
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
                    <span className="location-seat">{loc.deskName} · {loc.seatNumber}</span>
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

const RESIZE_OPTIONS = [4, 6, 8];

export default function FloorView({
  floors, activeFloorId, employees, assignedIds, canAssign,
  onSelectFloor, onAssign, onUnassign, onToggleSeatDisabled, onMoveDesk, onRotateDesk, onResizeDesk, onRenameDesk,
  floorImages,
}) {
  const [selectedDesk, setSelectedDesk] = useState(null);
  const [highlightedDesk, setHighlightedDesk] = useState(null);
  const [deskDrag, setDeskDrag] = useState(null);
  const [picker, setPicker] = useState(null);
  const [seatPin, setSeatPin] = useState(null);
  const deskRefs = useRef({});
  const canvasScrollRef = useRef(null);

  const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));
  const activeFloor = floors.find((f) => f.id === activeFloorId) || floors[0];
  const activeDesks = activeFloor?.desks || [];

  const handleNavigate = useCallback((emp, loc) => {
    if (!loc) return;
    if (loc.floorId !== activeFloorId) onSelectFloor(loc.floorId);

    // Wait for any floor switch to render before measuring
    setTimeout(() => {
      const canvas = canvasScrollRef.current;
      const deskEl = document.querySelector(`[data-desk-label="${loc.deskLabel}"]`);
      if (!deskEl || !canvas) return;

      const deskRect = deskEl.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();

      // True canvas-space coordinates accounting for scroll
      const pinX = deskRect.left - canvasRect.left + canvas.scrollLeft + deskRect.width / 2;
      const pinY = deskRect.top - canvasRect.top + canvas.scrollTop + deskRect.height / 2;

      setSeatPin({ x: pinX, y: pinY, key: Date.now() });

      canvas.scrollTo({
        left: Math.max(0, pinX - canvas.clientWidth / 2),
        top: Math.max(0, pinY - canvas.clientHeight / 2),
        behavior: "smooth",
      });
    }, 80);

    setTimeout(() => setSeatPin(null), 3500);
  }, [activeFloorId, onSelectFloor]);

  const handleDeskDragStart = useCallback((e, desk) => {
    setDeskDrag({ label: desk.label, startX: e.clientX, startY: e.clientY, origX: desk.x, origY: desk.y });
  }, []);

  const handleRotateClick = useCallback((desk) => {
    onRotateDesk(activeFloorId, desk.label, (desk.rotation + 90) % 360);
  }, [activeFloorId, onRotateDesk]);

  const handleResizeDesk = useCallback((desk, newSize) => {
    onResizeDesk(activeFloorId, desk.label, newSize);
  }, [activeFloorId, onResizeDesk]);

  const handleMouseMove = useCallback((e) => {
    if (deskDrag) {
      onMoveDesk(activeFloorId, deskDrag.label, deskDrag.origX + (e.clientX - deskDrag.startX), deskDrag.origY + (e.clientY - deskDrag.startY));
    }
  }, [deskDrag, activeFloorId, onMoveDesk]);

  const handleMouseUp = useCallback(() => {
    setDeskDrag(null);
  }, []);

  const handleSeatClick = useCallback((seat, floorId, e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(rect.right + 8, window.innerWidth - 260);
    const y = Math.min(rect.top, window.innerHeight - 340);
    const floor = floors.find((f) => f.id === floorId);
    const desk = (floor?.desks || []).find((d) => d.seats.some((s) => s.id === seat.id));
    const seatLabel = `${desk ? (desk.name || desk.label) : ""} · ${seat.label}`;
    setPicker({ seatId: seat.id, seatLabel, floorId, currentEmpId: seat.employeeId, x, y });
  }, [floors]);

  const isMoving = !!deskDrag;

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
        className={`canvas-scroll ${isMoving ? "cursor-grabbing" : ""}`}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="floor-canvas" onClick={() => { setSelectedDesk(null); setSeatPin(null); }}>
          {seatPin && (
            <div key={seatPin.key} className="seat-pin" style={{ left: seatPin.x, top: seatPin.y }}>
              <div className="seat-pin-head" />
              <div className="seat-pin-stem" />
            </div>
          )}
          {floorImages?.[activeFloor?.id] && (
            <img
              src={floorImages[activeFloor.id]}
              className="floor-bg-image"
              alt="Office layout"
              draggable={false}
            />
          )}
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
                  onUnassign={onUnassign}
                  onToggleSeatDisabled={onToggleSeatDisabled}
                  isSelected={selectedDesk === desk.label}
                  isHighlighted={highlightedDesk === desk.label}
                  onSelect={setSelectedDesk}
                  onDragStart={handleDeskDragStart}
                  onRotateClick={handleRotateClick}
                  onResizeDesk={handleResizeDesk}
                  onRenameDesk={(desk, name) => onRenameDesk(activeFloorId, desk.label, name)}
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
          seatLabel={picker.seatLabel}
          onAssign={(empId) => onAssign(empId, picker.seatId, picker.floorId)}
          onUnassign={() => onUnassign(picker.seatId)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
