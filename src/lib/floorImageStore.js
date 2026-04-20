const DB_NAME = "seats_manager";
const DB_VERSION = 1;
const STORE = "floor_images";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function getAllFloorImages() {
  const db = await openDB();
  return new Promise((resolve) => {
    const result = {};
    const req = db.transaction(STORE, "readonly").objectStore(STORE).openCursor();
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { result[cursor.key] = cursor.value; cursor.continue(); }
      else resolve(result);
    };
    req.onerror = () => resolve({});
  });
}

export async function saveFloorImage(floorId, dataUrl) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(dataUrl, String(floorId));
    tx.oncomplete = resolve;
    tx.onerror = (e) => reject(e.target.error);
  });
}

export async function removeFloorImage(floorId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(String(floorId));
    tx.oncomplete = resolve;
    tx.onerror = (e) => reject(e.target.error);
  });
}
