import { useEffect, useState } from "react";
import { useOktaAuth } from "@okta/okta-react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useSupabaseState } from "./hooks/useSupabaseState";
import { supabase } from "./lib/supabase";
import { DESK_LABELS, DESK_SIZES, createDesk, createFloor } from "./data";
import FloorView from "./components/FloorView";
import AdminTab from "./components/AdminTab";
import LoginPage from "./pages/LoginPage";
import "./App.css";

const PERMANENT_ADMINS = ["michal.brosh@riverside.fm", "michal.brosh@riverside.com"];

const mapDesks = (floor, fn) => ({ ...floor, desks: floor.desks.map(fn) });
const mapSeats = (desk, fn) => ({ ...desk, seats: desk.seats.map(fn) });

function SeatingApp() {
  const { authState, oktaAuth } = useOktaAuth();
  const [localAuth, setLocalAuth] = useLocalStorage("seats_localAuth", false);

  const isAuthed = authState?.isAuthenticated || localAuth;
  const userEmail = authState?.idToken?.claims?.email || "";
  const userName = userEmail ? userEmail.split("@")[0] : (localAuth ? "Local Admin" : "");

  const [floors, setFloors, floorsReady] = useSupabaseState("seats_floors", [createFloor(1, "Floor 1")]);
  const [employees, setEmployees, employeesReady] = useSupabaseState("seats_employees", []);
  // Per-user prefs stay in localStorage
  const [activeTab, setActiveTab] = useLocalStorage("seats_activeTab", "floor");
  const [activeFloorId, setActiveFloorId] = useLocalStorage("seats_activeFloorId", 1);
  const [floorImages, setFloorImages] = useState({});
  useEffect(() => {
    if (!supabase) return;
    supabase.storage.from("Floor Images").list().then(({ data: files }) => {
      if (!files) return;
      const images = {};
      files.forEach((f) => {
        const match = f.name.match(/^floor-(\w+)\./);
        if (match) {
          const { data } = supabase.storage.from("Floor Images").getPublicUrl(f.name);
          images[match[1]] = data.publicUrl;
        }
      });
      setFloorImages(images);
    });
  }, []);

  const setFloorImage = async (floorId, file) => {
    if (!supabase) return;
    const ext = file.name.split(".").pop();
    const path = `floor-${floorId}.${ext}`;
    const { error } = await supabase.storage.from("Floor Images").upload(path, file, { upsert: true });
    if (error) { console.error("Image upload failed", error); return; }
    const { data } = supabase.storage.from("Floor Images").getPublicUrl(path);
    setFloorImages((prev) => ({ ...prev, [String(floorId)]: data.publicUrl }));
  };

  const clearFloorImage = async (floorId) => {
    if (!supabase) return;
    const { data: files } = await supabase.storage.from("Floor Images").list();
    const toDelete = (files || []).filter((f) => f.name.startsWith(`floor-${floorId}.`)).map((f) => f.name);
    if (toDelete.length) await supabase.storage.from("Floor Images").remove(toDelete);
    setFloorImages((prev) => { const n = { ...prev }; delete n[String(floorId)]; return n; });
  };

  const ready = floorsReady && employeesReady;

  // Keep activeFloorId valid if floors changed (e.g. after Supabase load)
  useEffect(() => {
    if (!ready || floors.length === 0) return;
    if (!floors.find((f) => f.id === activeFloorId)) setActiveFloorId(floors[0].id);
  }, [floors, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const empByEmail = employees.find((e) => e.email?.toLowerCase() === userEmail.toLowerCase());
  const canAssign = localAuth || PERMANENT_ADMINS.includes(userEmail.toLowerCase()) || empByEmail?.isAdmin === true;

  const activeFloor = floors.find((f) => f.id === activeFloorId) || floors[0];

  // ── Floor ops ──
  const updateFloor = (id, updater) =>
    setFloors((prev) => prev.map((f) => (f.id === id ? updater(f) : f)));

  const addFloor = () => {
    const id = Date.now();
    const num = floors.length + 1;
    setFloors((prev) => [...prev, createFloor(id, `Floor ${num}`)]);
  };

  const renameFloor = (id, name) =>
    setFloors((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));

  const removeFloor = (id) => {
    setFloors((prev) => {
      const remaining = prev.filter((f) => f.id !== id);
      if (activeFloorId === id && remaining.length > 0) setActiveFloorId(remaining[0].id);
      return remaining;
    });
  };

  // ── Desk ops ──
  const usedLabels = new Set((activeFloor?.desks || []).map((d) => d.label));
  const nextLabel = DESK_LABELS.find((l) => !usedLabels.has(l));

  const addDesk = (floorId, size) => {
    const floor = floors.find((f) => f.id === floorId);
    const allDesks = floor?.desks || [];
    const label = DESK_LABELS.find((l) => !new Set(allDesks.map((d) => d.label)).has(l));
    if (!label) return;
    const idx = allDesks.length;
    const desk = createDesk(label, size, 60 + (idx % 4) * 260, 60 + Math.floor(idx / 4) * 200);
    updateFloor(floorId, (f) => ({ ...f, desks: [...f.desks, desk] }));
  };

  const removeDesk = (floorId, label) =>
    updateFloor(floorId, (f) => ({ ...f, desks: f.desks.filter((d) => d.label !== label) }));

  const moveDesk = (floorId, label, x, y) =>
    updateFloor(floorId, (f) => mapDesks(f, (d) => (d.label === label ? { ...d, x, y } : d)));

  const rotateDesk = (floorId, label, rotation) =>
    updateFloor(floorId, (f) => mapDesks(f, (d) => (d.label === label ? { ...d, rotation } : d)));

  const renameDesk = (floorId, label, name) =>
    updateFloor(floorId, (f) => mapDesks(f, (d) => (d.label === label ? { ...d, name } : d)));


  const resizeDesk = (floorId, label, newSize) =>
    updateFloor(floorId, (f) => mapDesks(f, (d) => {
      if (d.label !== label) return d;
      const occupied = d.seats.filter((s) => s.employeeId);
      const empty = d.seats.filter((s) => !s.employeeId);
      const kept = [...occupied, ...empty].slice(0, newSize);
      const newSeats = Array.from({ length: newSize }, (_, i) =>
        kept[i]
          ? { ...kept[i], id: `${label}${i + 1}`, label: `${i + 1}` }
          : { id: `${label}${i + 1}`, label: `${i + 1}`, employeeId: null }
      );
      return { ...d, size: newSize, seats: newSeats };
    }));

  // ── Label ops ──
  const addLabel = (floorId) =>
    updateFloor(floorId, (f) => ({ ...f, labels: [...(f.labels || []), { id: Date.now(), name: "Room", x: 120, y: 120 }] }));

  const removeLabel = (floorId, labelId) =>
    updateFloor(floorId, (f) => ({ ...f, labels: (f.labels || []).filter((l) => l.id !== labelId) }));

  const moveLabel = (floorId, labelId, x, y) =>
    updateFloor(floorId, (f) => ({ ...f, labels: (f.labels || []).map((l) => l.id === labelId ? { ...l, x, y } : l) }));

  const renameLabel = (floorId, labelId, name) =>
    updateFloor(floorId, (f) => ({ ...f, labels: (f.labels || []).map((l) => l.id === labelId ? { ...l, name } : l) }));

  // ── Employee ops ──
  const addEmployee = (name, department, email) => {
    setEmployees((prev) => [...prev, { id: Date.now(), name, department, email: email || "", isAdmin: false }]);
  };

  const removeEmployee = (id) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    setFloors((prev) =>
      prev.map((f) => mapDesks(f, (d) => mapSeats(d, (seat) => (seat.employeeId === id ? { ...seat, employeeId: null } : seat))))
    );
  };

  const toggleAdmin = (id) =>
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, isAdmin: !e.isAdmin } : e)));

  const importEmployees = (list) => {
    const base = Date.now();
    const newEmps = list.map((item, i) => ({
      id: base + i,
      name: item.name,
      department: item.department || "",
      email: item.email || "",
      isAdmin: false,
    }));
    setEmployees((prev) => [...prev, ...newEmps]);
  };

  // ── Seat ops ──
  const assignEmployee = (employeeId, seatId, floorId) => {
    setFloors((prev) =>
      prev.map((f) =>
        mapDesks(f, (d) =>
          mapSeats(d, (seat) => {
            if (seat.id === seatId && f.id === floorId) return { ...seat, employeeId };
            if (seat.employeeId === employeeId) return { ...seat, employeeId: null };
            return seat;
          })
        )
      )
    );
  };

  const unassignSeat = (seatId) => {
    setFloors((prev) =>
      prev.map((f) =>
        mapDesks(f, (d) => mapSeats(d, (seat) => (seat.id === seatId ? { ...seat, employeeId: null } : seat)))
      )
    );
  };

  const toggleSeatDisabled = (seatId) => {
    setFloors((prev) =>
      prev.map((f) =>
        mapDesks(f, (d) =>
          mapSeats(d, (seat) =>
            seat.id === seatId ? { ...seat, disabled: !seat.disabled, employeeId: null } : seat
          )
        )
      )
    );
  };

  // ── Derived ──
  const allSeats = floors.flatMap((f) => (f.desks || []).flatMap((d) => d.seats));
  const assignedIds = new Set(allSeats.map((s) => s.employeeId).filter(Boolean));
  const activeSeats = allSeats.filter((s) => !s.disabled);
  const totalSeats = activeSeats.length;
  const totalDesks = floors.reduce((a, f) => a + (f.desks || []).length, 0);

  if (!isAuthed) {
    return <LoginPage onLocalLogin={() => setLocalAuth(true)} />;
  }

  if (authState === null) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
        <span>Loading…</span>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
        <span>Loading…</span>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Riverside Seating</h1>
        <div className="user-switcher">
          <span className="user-label">
            {userName}
            {canAssign && <span className="admin-indicator">Admin</span>}
          </span>
          <button
            className="logout-btn"
            onClick={() => { if (authState?.isAuthenticated) oktaAuth.signOut({ postLogoutRedirectUri: window.location.origin }); else setLocalAuth(false); }}
          >
            Sign out
          </button>
        </div>
      </header>
      <nav className="tabs">
        <button className={`tab ${activeTab === "floor" ? "active" : ""}`} onClick={() => setActiveTab("floor")}>
          Floor View
        </button>
        {canAssign && (
          <button className={`tab ${activeTab === "admin" ? "active" : ""}`} onClick={() => setActiveTab("admin")}>
            Admin
          </button>
        )}
      </nav>
      <div className="app-body">
        {activeTab === "floor" || !canAssign ? (
          <FloorView
            floors={floors}
            activeFloorId={activeFloorId}
            employees={employees}
            assignedIds={assignedIds}
            canAssign={canAssign}
            onSelectFloor={setActiveFloorId}
            onAssign={assignEmployee}
            onUnassign={unassignSeat}
            onToggleSeatDisabled={toggleSeatDisabled}
            onMoveDesk={moveDesk}
            onRotateDesk={rotateDesk}
            onResizeDesk={resizeDesk}
            onRenameDesk={renameDesk}
            onAddLabel={addLabel}
            onRemoveLabel={removeLabel}
            onMoveLabel={moveLabel}
            onRenameLabel={renameLabel}
            floorImages={floorImages}
          />
        ) : (
          <AdminTab
            floors={floors}
            activeFloorId={activeFloorId}
            employees={employees}
            deskSizes={DESK_SIZES}
            onSelectFloor={setActiveFloorId}
            onAddFloor={addFloor}
            onRenameFloor={renameFloor}
            onRemoveFloor={removeFloor}
            stats={{ occupied: assignedIds.size, available: totalSeats - assignedIds.size, desks: totalDesks }}
            onAddDesk={addDesk}
            onRemoveDesk={removeDesk}
            onAddLabel={addLabel}
            onRemoveLabel={removeLabel}
            floorImages={floorImages}
            onSetFloorImage={setFloorImage}
            onClearFloorImage={clearFloorImage}
            onAddEmployee={addEmployee}
            onRemoveEmployee={removeEmployee}
            onToggleAdmin={toggleAdmin}
            onImportEmployees={importEmployees}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return <SeatingApp />;
}
