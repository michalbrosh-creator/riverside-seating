export const DESK_SIZES = [2, 4, 6, 8];
const _letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const DESK_LABELS = [
  ..._letters,
  ..._letters.flatMap((a) => _letters.map((b) => a + b)),
];

export const createDesk = (label, size, x = 40, y = 40) => ({
  id: label,
  label,
  size,
  x,
  y,
  rotation: 0,
  seats: Array.from({ length: size }, (_, i) => ({
    id: `${label}${i + 1}`,
    label: `${i + 1}`,
    employeeId: null,
    disabled: false,
  })),
});

export const createFloor = (id, name) => ({ id, name, desks: [] });
