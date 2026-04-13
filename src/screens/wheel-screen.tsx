import { useState } from 'react';
import { FaFileImport, FaPlus, FaXmark } from 'react-icons/fa6';
import { useAppStore } from '../app/store';
import { AppShell, BottomNav, ScreenScroller } from '../components/layout';

export function WheelScreen() {
  const { state, actions } = useAppStore();
  const [newOption, setNewOption] = useState('');

  return (
    <AppShell className="bg-slate-900" statusLight indicatorLight>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-700 via-slate-900 to-black" />
      <ScreenScroller className="flex flex-col items-center px-6 pb-28 text-white">
        <div className="relative z-10 flex w-full flex-col items-center">
          <h2 className="mt-4 mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-2xl font-bold text-transparent">
            纠结终结者
          </h2>
          <p className="mb-10 text-xs text-slate-400">把命运交给转盘，抽到啥吃啥</p>

          <div className="relative mb-8 h-[300px] w-[300px]">
            <div
              className="relative h-full w-full rounded-full border-4 border-white shadow-[0_10px_25px_rgba(239,68,68,0.3)] transition-transform duration-[3000ms] ease-out"
              style={{
                background:
                  'conic-gradient(#ef4444 0deg 60deg, #f87171 60deg 120deg, #fca5a5 120deg 180deg, #ef4444 180deg 240deg, #f87171 240deg 300deg, #fca5a5 300deg 360deg)',
                transform: `rotate(${state.wheelRotation}deg)`,
              }}
            >
              <div className="absolute inset-0 rounded-full border-8 border-slate-800/50 shadow-[0_0_50px_rgba(239,68,68,0.3)]" />
              <div className="absolute left-1/2 top-1/2 flex h-[60px] w-[60px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white font-bold text-theme-500 shadow-inner">
                抽!
              </div>
            </div>
            <div className="absolute left-1/2 top-[-10px] h-0 w-0 -translate-x-1/2 border-x-[15px] border-t-[25px] border-x-transparent border-t-slate-800" />
            <button
              type="button"
              onClick={() => actions.spinWheel()}
              className="absolute left-1/2 top-1/2 h-[60px] w-[60px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent"
            />
          </div>

          {state.wheelResult ? (
            <div className="mb-6 rounded-full border border-theme-500/30 bg-theme-500/20 px-4 py-2 text-sm font-bold text-theme-300">
              这把吃：{state.wheelResult}
            </div>
          ) : null}

          <div className="w-full rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-200">当前选项 ({state.wheelOptions.length})</span>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => actions.importWheelOptions()} className="rounded bg-white/20 px-2 py-1">
                  <FaFileImport className="inline" /> 历史导入
                </button>
                <button type="button" onClick={() => actions.clearWheelOptions()} className="px-2 py-1 text-theme-400">
                  清空
                </button>
              </div>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {state.wheelOptions.map((option) => (
                <div key={option.id} className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-sm">
                  {option.name}
                  <button type="button" onClick={() => actions.removeWheelOption(option.id)} className="text-slate-500">
                    <FaXmark />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newOption}
                onChange={(event) => setNewOption(event.target.value)}
                placeholder="添加新选项"
                className="flex-1 rounded-full border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  actions.addWheelOption(newOption);
                  setNewOption('');
                }}
                className="rounded-full border border-theme-500/30 bg-theme-500/20 px-4 py-2 text-sm text-theme-300"
              >
                <FaPlus className="inline" /> 添加
              </button>
            </div>
          </div>
        </div>
      </ScreenScroller>

      <BottomNav currentPage="wheel" onNavigate={actions.navigate} dark />
    </AppShell>
  );
}
