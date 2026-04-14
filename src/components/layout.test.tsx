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
});
