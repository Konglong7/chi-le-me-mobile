import { calculateTargetWheelRotation, getWinningWheelIndex } from './wheel';

describe('wheel targeting', () => {
  it('lands the selected option under the top pointer', () => {
    const rotation = calculateTargetWheelRotation({
      currentRotation: 45,
      optionCount: 5,
      targetIndex: 3,
    });

    expect(getWinningWheelIndex(rotation, 5)).toBe(3);
  });

  it('works with different segment counts and keeps extra spin distance', () => {
    const rotation = calculateTargetWheelRotation({
      currentRotation: 270,
      optionCount: 7,
      targetIndex: 0,
      extraSpins: 5,
    });

    expect(getWinningWheelIndex(rotation, 7)).toBe(0);
    expect(rotation).toBeGreaterThan(270 + 360);
  });
});
