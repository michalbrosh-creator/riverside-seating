import { useState, useCallback } from "react";

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return initialValue;
      const parsed = JSON.parse(stored);
      if (parsed === null) return initialValue;
      // migrate floors: flatten any sections format back to flat desks
      if (key === "seats_floors" && Array.isArray(parsed)) {
        return parsed.map((floor) => {
          if (!floor.sections) return floor; // already flat
          const desks = floor.sections.flatMap((s) => s.desks || []);
          return { id: floor.id, name: floor.name, desks };
        });
      }
      return parsed;
    } catch {
      return initialValue;
    }
  });

  const set = useCallback((newValue) => {
    setValue((prev) => {
      const resolved = typeof newValue === "function" ? newValue(prev) : newValue;
      try {
        localStorage.setItem(key, JSON.stringify(resolved));
      } catch {}
      return resolved;
    });
  }, [key]);

  return [value, set];
}
