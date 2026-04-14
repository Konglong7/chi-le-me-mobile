import { useEffect, useMemo, useRef, useState } from 'react';
import { FaFileImport, FaPlus, FaXmark } from 'react-icons/fa6';
import { useAppStore } from '../app/store';
import { AppShell, BottomNav, ScreenScroller } from '../components/layout';
import { playWheelSpinSound } from '../lib/audio';
import { buildWheelGradient, buildWheelLabelLayout, getWinningWheelIndex } from '../lib/wheel';
import { wheelPresets } from '../lib/wheel-presets';
export function WheelScreen() {
  const { state, actions } = useAppStore();
  const [customImport, setCustomImport] = useState('');
  const [liveResult, setLiveResult] = useState(state.wheelResult);
  const [animatedRotation, setAnimatedRotation] = useState(state.wheelRotation);
  const latestResultRef = useRef(state.wheelResult);
  const previousRotationRef = useRef(state.wheelRotation);
  const animationFrameRef = useRef<number | null>(null);
  const hasOptions = state.wheelOptions.length > 0;
  const segments = useMemo(() => {
    const options = hasOptions ? state.wheelOptions : [{ id: 'placeholder', name: '请先导入选项' }];

    return options.map((option, index) => ({
      ...option,
      ...buildWheelLabelLayout({
        name: option.name,
        index,
        optionCount: options.length,
        wheelDiameter: 300,
      }),
    }));
  }, [hasOptions, state.wheelOptions]);

  const wheelGradient = useMemo(() => buildWheelGradient(segments.length), [segments.length]);

  useEffect(() => {
    latestResultRef.current = state.wheelResult;
    setLiveResult(state.wheelResult);
  }, [state.wheelResult]);

  useEffect(() => {
    if (!hasOptions) {
      previousRotationRef.current = state.wheelRotation;
      setAnimatedRotation(state.wheelRotation);
      return;
    }

    const from = previousRotationRef.current;
    const to = state.wheelRotation;

    if (from === to) {
      setAnimatedRotation(to);
      return;
    }

    const duration = 3000;
    const start = performance.now();

    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }

    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const nextRotation = from + (to - from) * eased;
      const nextIndex = getWinningWheelIndex(nextRotation, state.wheelOptions.length);

      setAnimatedRotation(nextRotation);
      setLiveResult(state.wheelOptions[nextIndex]?.name ?? latestResultRef.current);

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(animate);
        return;
      }

      previousRotationRef.current = to;
      setAnimatedRotation(to);
      setLiveResult(latestResultRef.current);
      animationFrameRef.current = null;
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [hasOptions, state.wheelOptions, state.wheelRotation]);

  const importCustomOptions = () => {
    const names = customImport
      .split(/[\n,，]/g)
      .map((item) => item.trim())
      .filter(Boolean);

    actions.addWheelOptions(names);
    setCustomImport('');
  };

  return (
    <AppShell className="bg-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-700 via-slate-900 to-black" />
      <ScreenScroller className="flex flex-col items-center px-6 pb-28 pt-6 text-white">
        <div className="relative z-10 flex w-full flex-col items-center">
          <h2 className="mt-4 mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-2xl font-bold text-transparent">
            纠结终结者
          </h2>
          <p className="mb-8 text-xs text-slate-400">把命运交给转盘，抽到啥吃啥</p>

          <div className="relative mb-8 h-[300px] w-[300px]">
            <div
              className="wheel-surface relative h-full w-full rounded-full border-4 border-white shadow-[0_10px_25px_rgba(239,68,68,0.3)]"
              style={{
                background: wheelGradient,
                transform: `rotate(${animatedRotation}deg)`,
              }}
            >
              <div className="absolute inset-0 rounded-full border-8 border-slate-800/50 shadow-[0_0_50px_rgba(239,68,68,0.3)]" />
              {segments.map((segment) => {
                const visibleAngle = ((segment.centerAngle + animatedRotation) % 360 + 360) % 360;
                const isLeftSide = visibleAngle > 90 && visibleAngle < 270;
                const textAngle = isLeftSide ? (segment.textAngle + 180) % 360 : segment.textAngle;

                return (
                  <div
                    key={segment.id}
                    data-testid="wheel-label"
                    className="wheel-label"
                    style={{
                      transform: `translate(-50%, -50%) rotate(${segment.centerAngle}deg)`,
                    }}
                  >
                    <div
                      className="wheel-label__body"
                      style={{
                        transform: `translateY(-50%) translateX(${segment.radialOffset}px) rotate(${textAngle}deg)`,
                        width: `${segment.width}px`,
                        fontSize: `${segment.fontSize}px`,
                        lineHeight: segment.lineHeight,
                      }}
                    >
                      {segment.lines.map((line, lineIndex) => (
                        <span key={`${segment.id}-${lineIndex}`} className="wheel-label__line">
                          {line}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="absolute left-1/2 top-1/2 flex h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-white font-black text-theme-500 shadow-[0_12px_28px_rgba(239,68,68,0.35)]">
                抽!
              </div>
            </div>
            <div className="absolute left-1/2 top-[-10px] h-0 w-0 -translate-x-1/2 border-x-[15px] border-t-[25px] border-x-transparent border-t-slate-100" />
            <button
              type="button"
              aria-label="开始转盘"
              disabled={!hasOptions}
              onClick={() => {
                if (!hasOptions) {
                  return;
                }

                playWheelSpinSound();
                actions.spinWheel();
              }}
              className="absolute left-1/2 top-1/2 h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent disabled:cursor-not-allowed"
            />
          </div>

          {liveResult ? (
            <div className="mb-6 rounded-full border border-theme-500/30 bg-theme-500/20 px-4 py-2 text-sm font-bold text-theme-300">
              这把吃：{liveResult}
            </div>
          ) : null}

          <div className="mb-4 w-full rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-200">快捷导入套餐</span>
              <button
                type="button"
                onClick={() => actions.importWheelOptions()}
                className="rounded bg-white/20 px-2 py-1 text-xs"
              >
                <FaFileImport className="mr-1 inline" />
                历史导入
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(wheelPresets).map(([label, foods]) => (
                <button
                  key={label}
                  type="button"
                  aria-label={`快捷导入 ${label}`}
                  onClick={() => actions.addWheelOptions(foods)}
                  className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-100"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-200">当前选项 ({state.wheelOptions.length})</span>
              <button type="button" onClick={() => actions.clearWheelOptions()} className="px-2 py-1 text-xs text-theme-300">
                清空
              </button>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {state.wheelOptions.map((option) => (
                <div key={option.id} className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-sm">
                  {option.name}
                  <button type="button" onClick={() => actions.removeWheelOption(option.id)} className="text-slate-500">
                    <FaXmark />
                  </button>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <textarea
                value={customImport}
                onChange={(event) => setCustomImport(event.target.value)}
                placeholder="自定义导入：用逗号或换行分隔，例如 KFC, 麦当劳, 黄焖鸡"
                className="min-h-[92px] w-full resize-none rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="自定义导入"
                  onClick={importCustomOptions}
                  className="rounded-full border border-theme-500/30 bg-theme-500/20 px-4 py-2 text-sm text-theme-300"
                >
                  <FaFileImport className="mr-1 inline" />
                  自定义导入
                </button>
                <button
                  type="button"
                  aria-label="添加单个选项"
                  onClick={() => {
                    actions.addWheelOptions(customImport ? [customImport] : []);
                    setCustomImport('');
                  }}
                  className="rounded-full border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm text-slate-100"
                >
                  <FaPlus className="mr-1 inline" />
                  添加单个选项
                </button>
              </div>
            </div>
          </div>
        </div>
      </ScreenScroller>

      <BottomNav currentPage="wheel" onNavigate={actions.navigate} />
    </AppShell>
  );
}
