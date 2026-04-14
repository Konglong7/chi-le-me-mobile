const FULL_TURN = 360;
const DEFAULT_EXTRA_SPINS = 4;
const WHEEL_COLORS = ['#ef4444', '#fb7185', '#f59e0b', '#facc15', '#22c55e', '#14b8a6', '#38bdf8', '#818cf8', '#a855f7', '#ec4899'];

function normalizeDegrees(value: number) {
  const normalized = value % FULL_TURN;
  return normalized < 0 ? normalized + FULL_TURN : normalized;
}

export function calculateTargetWheelRotation({
  currentRotation,
  optionCount,
  targetIndex,
  extraSpins = DEFAULT_EXTRA_SPINS,
}: {
  currentRotation: number;
  optionCount: number;
  targetIndex: number;
  extraSpins?: number;
}) {
  if (optionCount <= 0) {
    return currentRotation;
  }

  const slice = FULL_TURN / optionCount;
  const targetCenter = targetIndex * slice + slice / 2;
  const current = normalizeDegrees(currentRotation);
  const delta = (FULL_TURN - normalizeDegrees(current + targetCenter)) % FULL_TURN;

  return currentRotation + extraSpins * FULL_TURN + delta;
}

export function getWinningWheelIndex(rotation: number, optionCount: number) {
  if (optionCount <= 0) {
    return -1;
  }

  const slice = FULL_TURN / optionCount;
  const pointerAngle = normalizeDegrees(FULL_TURN - normalizeDegrees(rotation));
  return Math.min(optionCount - 1, Math.floor(pointerAngle / slice));
}

export function buildWheelGradient(optionCount: number) {
  if (optionCount <= 0) {
    return 'conic-gradient(#334155 0deg 360deg)';
  }

  const slice = FULL_TURN / optionCount;
  const stops = Array.from({ length: optionCount }, (_, index) => {
    const start = (index * slice).toFixed(3);
    const end = ((index + 1) * slice).toFixed(3);
    return `${WHEEL_COLORS[index % WHEEL_COLORS.length]} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${stops.join(', ')})`;
}
