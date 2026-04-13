import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { SharePost } from '../app/types';

export function Avatar({
  seed,
  className,
}: {
  seed: string;
  className?: string;
}) {
  return (
    <img
      alt=""
      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`}
      className={clsx('rounded-full bg-slate-100', className)}
    />
  );
}

export function SectionCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx('rounded-2xl border border-slate-100 bg-white shadow-sm app-panel', className)}>{children}</section>;
}

export function PrimaryButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        'rounded-xl bg-theme-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition active:scale-[0.98]',
        'tap-effect',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function ActionTile({
  title,
  subtitle,
  icon,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      {...props}
      aria-label={props['aria-label'] ?? title}
      className={clsx(
        'flex flex-1 items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:scale-[0.98] app-panel tap-effect',
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full">{icon}</div>
      <div>
        <div className="font-bold text-slate-800">{title}</div>
        <div className="text-xs text-slate-400">{subtitle}</div>
      </div>
    </button>
  );
}

export function StatusChip({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'blue' | 'purple' | 'yellow' | 'green' | 'red';
}) {
  const tones = {
    neutral: 'border-slate-100 bg-slate-50 text-slate-500',
    blue: 'border-blue-100 bg-blue-50 text-blue-500',
    purple: 'border-purple-100 bg-purple-50 text-purple-500',
    yellow: 'border-yellow-200 bg-yellow-100 text-yellow-600',
    green: 'border-green-100 bg-green-100 text-green-600',
    red: 'border-red-100 bg-red-50 text-red-500',
  };

  return <span className={clsx('rounded px-2 py-0.5 text-[10px] border', tones[tone])}>{children}</span>;
}

export function ShareStars({ rating }: { rating: number }) {
  return (
    <div className="flex text-[10px] text-yellow-400">
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index}>{index < rating ? '★' : '☆'}</span>
      ))}
    </div>
  );
}

export function SharePreviewCard({ share }: { share: SharePost }) {
  return (
    <div className="min-w-[140px] rounded-xl border border-slate-50 bg-white p-3 shadow-sm app-panel">
      <div className="mb-1 truncate text-sm font-bold text-slate-800">{share.foodName}</div>
      <ShareStars rating={share.rating} />
      <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
        <Avatar seed={share.sharedAvatarSeed} className="h-4 w-4" />
        <span>{share.sharedBy}分享</span>
      </div>
    </div>
  );
}
