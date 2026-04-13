import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

const STORAGE_KEY = 'chi-le-me-state';

describe('App shell', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the welcome screen when no nickname is stored', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: '今天吃什么？' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('输入你的干饭昵称 (必填)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '进入干饭圈' })).toBeInTheDocument();
  });

  it('enters the app and stores the nickname locally', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByPlaceholderText('输入你的干饭昵称 (必填)'), '麻辣小王子');
    await user.click(screen.getByRole('button', { name: '进入干饭圈' }));

    expect(screen.getByRole('heading', { name: '一起吃点啥' })).toBeInTheDocument();
    expect(screen.getByText('麻辣小王子')).toBeInTheDocument();

    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).toContain('麻辣小王子');
  });

  it('restores the last session from local storage', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentUser: {
          nickname: '火锅杀手',
        },
      }),
    );

    render(<App />);

    expect(screen.getByRole('heading', { name: '一起吃点啥' })).toBeInTheDocument();
    expect(screen.getByText('火锅杀手')).toBeInTheDocument();
  });
});
