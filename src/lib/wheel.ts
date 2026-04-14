const FULL_TURN = 360;
const DEFAULT_EXTRA_SPINS = 4;
const WHEEL_COLORS = ['#ef4444', '#fb7185', '#f59e0b', '#facc15', '#22c55e', '#14b8a6', '#38bdf8', '#818cf8', '#a855f7', '#ec4899'];

function normalizeDegrees(value: number) {
  const normalized = value % FULL_TURN;
  return normalized < 0 ? normalized + FULL_TURN : normalized;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export interface WheelLabelLayout {
  centerAngle: number;
  textAngle: number;
  radialOffset: number;
  width: number;
  fontSize: number;
  lineHeight: number;
  lines: string[];
}

export function splitWheelLabel(name: string) {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return [''];
  }

  const charCount = trimmed.length;
  const isAscii = /^[\u0000-\u007f]+$/.test(trimmed);

  if (charCount <= 4) {
    return [trimmed];
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (isAscii && words.length > 1 && charCount > 6) {
    const splitPoint = Math.ceil(words.length / 2);
    const lines = [
      words.slice(0, splitPoint).join(' '),
      words.slice(splitPoint).join(' '),
    ]
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length > 1) {
      return lines;
    }
  }

  if (charCount <= 6) {
    const firstLine = trimmed.slice(0, 3).trim();
    const secondLine = trimmed.slice(3).trim();
    return secondLine ? [firstLine, secondLine] : [firstLine];
  }

  const splitIndex = Math.ceil(charCount / 2);
  const firstLine = trimmed.slice(0, splitIndex).trim();
  const secondLine = trimmed.slice(splitIndex).trim();
  return secondLine ? [firstLine, secondLine] : [firstLine];
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

export function buildWheelLabelLayout({
  name,
  index,
  optionCount,
  wheelDiameter = 300,
}: {
  name: string;
  index: number;
  optionCount: number;
  wheelDiameter?: number;
}): WheelLabelLayout {
  const safeOptionCount = Math.max(1, optionCount);
  const slice = FULL_TURN / safeOptionCount;
  const centerAngle = index * slice + slice / 2;
  const radius = wheelDiameter / 2;
  const normalizedCount = Math.max(safeOptionCount, 3);
  const radialRatio = clamp(0.61 - (normalizedCount - 3) * 0.006, 0.4, 0.61);
  const widthRatio = clamp(0.24 - (normalizedCount - 3) * 0.005, 0.16, 0.24);
  const lines = splitWheelLabel(name);
  const radialOffset = radius * radialRatio;
  const sliceAngle = (slice * Math.PI) / 180;
  const sectorWidth = radialOffset * 2 * Math.sin(sliceAngle / 2);
  const width = Math.min(wheelDiameter * widthRatio, sectorWidth);

  return {
    centerAngle,
    textAngle: 90,
    radialOffset,
    width,
    fontSize: lines.length > 1 ? 12 : 13,
    lineHeight: lines.length > 1 ? 1.1 : 1.2,
    lines,
  };
}
