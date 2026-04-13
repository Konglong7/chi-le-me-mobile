import clsx from 'clsx';
import type { ReactNode } from 'react';
import { FaBatteryFull, FaHouse, FaRegClock, FaSignal, FaWifi } from 'react-icons/fa6';
import type { AppPage } from '../app/types';

interface ShellProps {
  children: ReactNode;
  className?: string;
  statusLight?: boolean;
  indicatorLight?: boolean;
}

interface BottomNavProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  dark?: boolean;
}

export function AppShell({ children, className, statusLight = false, indicatorLight = false }: ShellProps) {
  return (
    <div className="min-h-screen bg-[var(--app-bg)] md:p-8">
      <div
        className={clsx(
          'relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-white md:min-h-[900px] md:rounded-[42px] md:border-[14px] md:border-slate-800 md:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.28)]',
          className,
        )}
      >
        <StatusBar light={statusLight} />
        <div className="absolute left-1/2 top-0 z-50 h-[30px] w-[120px] -translate-x-1/2 rounded-b-[16px] bg-slate-800" />
        {children}
        <div
          className={clsx(
            'pointer-events-none absolute bottom-2 left-1/2 z-50 h-[5px] w-[140px] -translate-x-1/2 rounded-full',
            indicatorLight ? 'bg-white' : 'bg-black',
          )}
        />
      </div>
    </div>
  );
}

export function ScreenScroller({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={clsx('relative flex-1 overflow-y-auto pt-11 hide-scrollbar', className)}>{children}</main>;
}

export function BottomNav({ currentPage, onNavigate, dark = false }: BottomNavProps) {
  const items: Array<{ page: AppPage; label: string; icon: ReactNode }> = [
    { page: 'home', label: '首页', icon: <FaHouse /> },
    { page: 'wheel', label: '转盘', icon: <span className="text-[20px] leading-none">◎</span> },
    { page: 'history', label: '历史', icon: <FaRegClock /> },
  ];

  return (
    <div
      className={clsx(
        'absolute bottom-0 left-0 z-40 flex h-[84px] w-full items-start justify-around border-t px-4 pb-6 pt-3',
        dark
          ? 'border-slate-800 bg-slate-900/90 text-white backdrop-blur'
          : 'border-slate-100 bg-white/95 shadow-[0_-10px_30px_rgba(15,23,42,0.04)] backdrop-blur',
      )}
    >
      {items.map((item) => {
        const active = item.page === currentPage;

        return (
          <button
            key={item.page}
            type="button"
            onClick={() => onNavigate(item.page)}
            className={clsx(
              'flex min-w-[64px] flex-col items-center gap-1 text-[11px] transition tap-effect',
              active ? 'text-theme-500' : dark ? 'text-slate-500' : 'text-slate-400',
            )}
          >
            <span className="text-[18px]">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function StatusBar({ light = false }: { light?: boolean }) {
  return (
    <div
      className={clsx(
        'pointer-events-none absolute left-0 top-0 z-50 flex h-11 w-full items-center justify-between px-6 text-[14px] font-semibold',
        light ? 'text-white' : 'text-black',
      )}
    >
      <span>09:41</span>
      <div className="flex items-center gap-1.5 text-xs">
        <FaSignal />
        <FaWifi />
        <FaBatteryFull />
      </div>
    </div>
  );
}
