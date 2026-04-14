import clsx from 'clsx';
import type { ReactNode } from 'react';
import { FaHouse, FaRegClock } from 'react-icons/fa6';
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
    <div className="h-[100svh] overflow-hidden bg-[var(--app-bg)] md:flex md:min-h-screen md:h-auto md:items-center md:justify-center md:p-8">
      <div
        className={clsx(
          'relative mx-auto flex h-[100svh] min-h-0 w-full max-w-[430px] flex-col overflow-hidden bg-white md:h-[900px] md:rounded-[42px] md:border-[14px] md:border-slate-800 md:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.28)]',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function ScreenScroller({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={clsx('relative min-h-0 flex-1 overflow-y-auto hide-scrollbar', className)}>{children}</main>;
}

export function BottomNav({ currentPage, onNavigate, dark = false }: BottomNavProps) {
  const items: Array<{ page: AppPage; label: string; icon: ReactNode }> = [
    { page: 'home', label: '首页', icon: <FaHouse /> },
    { page: 'wheel', label: '转盘', icon: <span className="text-[20px] leading-none">◎</span> },
    { page: 'history', label: '历史', icon: <FaRegClock /> },
  ];

  return (
    <nav
      aria-label="主导航"
      className={clsx(
        'absolute bottom-0 left-0 z-40 flex h-[84px] w-full items-start justify-around border-t px-4 pb-6 pt-3',
        dark
          ? 'border-white/10 bg-slate-950/88 text-white shadow-[0_-12px_32px_rgba(2,6,23,0.45)] backdrop-blur-xl'
          : 'border-slate-100 bg-white/95 shadow-[0_-10px_30px_rgba(15,23,42,0.04)] backdrop-blur',
      )}
    >
      {items.map((item) => {
        const active = item.page === currentPage;

        return (
          <button
            key={item.page}
            type="button"
            aria-label={item.label}
            onClick={() => onNavigate(item.page)}
            className={clsx(
              'flex min-w-[72px] flex-col items-center gap-1.5 text-[11px] font-medium leading-none transition tap-effect',
              active ? (dark ? 'text-theme-400' : 'text-theme-500') : dark ? 'text-slate-300/70' : 'text-slate-400',
            )}
          >
            <span className="text-[18px]">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
