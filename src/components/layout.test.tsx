import { render, screen } from '@testing-library/react';
import { AppShell, BottomNav, ScreenScroller } from './layout';

describe('mobile shell layout', () => {
  it('pins the shell to the viewport and keeps scrolling inside the main area', () => {
    const { container } = render(
      <AppShell>
        <ScreenScroller>
          <div>滚动内容</div>
        </ScreenScroller>
        <BottomNav currentPage="home" onNavigate={() => undefined} />
      </AppShell>,
    );

    const viewport = container.firstElementChild as HTMLElement;
    const frame = screen.getByRole('main').parentElement as HTMLElement;

    expect(viewport).toHaveClass('h-[100svh]');
    expect(viewport).toHaveClass('overflow-hidden');
    expect(frame).toHaveClass('h-[100svh]');
    expect(frame).toHaveClass('min-h-0');
    expect(frame).not.toHaveClass('min-h-screen');
    expect(screen.getByRole('main')).toHaveClass('min-h-0');
  });

  it('renders wheel dark bottom navigation with refined styles', () => {
    render(<BottomNav currentPage="wheel" onNavigate={() => undefined} dark />);

    const nav = screen.getByRole('navigation', { name: '主导航' });
    const wheelButton = screen.getByRole('button', { name: '转盘' });
    const homeButton = screen.getByRole('button', { name: '首页' });

    expect(nav).toHaveClass('bg-slate-950/88');
    expect(nav).toHaveClass('backdrop-blur-xl');
    expect(wheelButton).toHaveClass('text-theme-400');
    expect(homeButton).toHaveClass('text-slate-300/70');
  });

  it('keeps light bottom navigation button sizing and spacing unchanged', () => {
    render(<BottomNav currentPage="home" onNavigate={() => undefined} />);

    const homeButton = screen.getByRole('button', { name: '首页' });

    expect(homeButton).toHaveClass('min-w-[64px]');
    expect(homeButton).toHaveClass('gap-1');
    expect(homeButton).not.toHaveClass('font-medium');
    expect(homeButton).not.toHaveClass('leading-none');
  });
});
