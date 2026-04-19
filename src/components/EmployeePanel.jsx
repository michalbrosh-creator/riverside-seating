export default function EmployeePanel({
  employees, seats, assignedIds, selectedSeat, search, onSearch, onAssign,
}) {
  const getSeatForEmployee = (empId) => seats.find((s) => s.employeeId === empId);

  return (
    <div className="employee-panel">
      <h2>Employees</h2>
      {selectedSeat && (
        <div className="assign-hint">
          Seat #{selectedSeat.id} selected — click an employee to assign
        </div>
      )}
      <input
        className="search-input"
        type="text"
        placeholder="Search by name or department..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      <ul className="employee-list">
        {employees.map((emp) => {
          const seat = getSeatForEmployee(emp.id);
          return (
            <li
              key={emp.id}
              className={`employee-item ${selectedSeat ? "clickable" : ""} ${seat ? "has-seat" : ""}`}
              onClick={() => selectedSeat && onAssign(emp.id)}
            >
              <div className="emp-info">
                <span className="emp-name">{emp.name}</span>
                <span className="emp-dept">{emp.department}</span>
              </div>
              <div className="emp-seat">
                {seat ? (
                  <span className="seat-badge occupied">Seat #{seat.id}</span>
                ) : (
                  <span className="seat-badge unassigned">Unassigned</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
