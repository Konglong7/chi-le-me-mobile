import { buildWheelLabelLayout, calculateTargetWheelRotation, getWinningWheelIndex, splitWheelLabel } from './wheel';

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

describe('wheel label helpers', () => {
  it('splits short Latin labels into a single line', () => {
    expect(splitWheelLabel('KFC')).toEqual(['KFC']);
  });

  it('keeps short non-Latin labels as one line', () => {
    expect(splitWheelLabel('麦当劳')).toEqual(['麦当劳']);
  });

  it('splits longer names evenly across two lines', () => {
    expect(splitWheelLabel('黄焖鸡米饭')).toEqual(['黄焖鸡', '米饭']);
  });

  it('builds layout metadata for a multi-line label', () => {
    const layout = buildWheelLabelLayout({
      name: '黄焖鸡米饭',
      index: 2,
      optionCount: 6,
      wheelDiameter: 300,
    });

    expect(layout.centerAngle).toBe(150);
    expect(layout.textAngle).toBe(90);
    expect(layout.radialOffset).toBeGreaterThan(82);
    expect(layout.radialOffset).toBeLessThan(102);
    expect(layout.lines).toEqual(['黄焖鸡', '米饭']);
  });

  it('wraps long ASCII labels predictably', () => {
    expect(splitWheelLabel('Roasted Chicken Rice')).toEqual(['Roasted Chicken', 'Rice']);
  });

  it('shrinks layout geometry for 13+ options', () => {
    const layout12 = buildWheelLabelLayout({
      name: 'Multi Option',
      index: 0,
      optionCount: 12,
      wheelDiameter: 300,
    });

    const layout13 = buildWheelLabelLayout({
      name: 'Multi Option',
      index: 0,
      optionCount: 13,
      wheelDiameter: 300,
    });

    expect(layout13.radialOffset).toBeLessThan(layout12.radialOffset);
    expect(layout13.width).toBeLessThan(layout12.width);
  });
});
