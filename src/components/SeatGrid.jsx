export default function SeatGrid({ seats, employees, selectedSeat, onSelectSeat, onUnassign }) {
  const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));

  return (
    <div className="seat-grid-container">
      <h2>Office Floor</h2>
      <div className="seat-grid">
        {seats.map((seat) => {
          const emp = seat.employeeId ? empMap[seat.employeeId] : null;
          const isSelected = selectedSeat?.id === seat.id;
          return (
            <div
              key={seat.id}
              className={`seat ${emp ? "occupied" : "available"} ${isSelected ? "selected" : ""}`}
              onClick={() => onSelectSeat(isSelected ? null : seat)}
            >
              <div className="seat-number">#{seat.id}</div>
              {emp ? (
                <>
                  <div className="seat-name">{emp.name.split(" ")[0]}</div>
                  <button
                    className="unassign-btn"
                    onClick={(e) => { e.stopPropagation(); onUnassign(seat.id); }}
                    title="Unassign"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <div className="seat-empty">Empty</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="legend">
        <span className="legend-item available">Available</span>
        <span className="legend-item occupied">Occupied</span>
        <span className="legend-item selected">Selected</span>
      </div>
    </div>
  );
}
