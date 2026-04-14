import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { App } from '../app/App';

async function enterApp() {
  const user = userEvent.setup();

  render(<App />);
  await user.type(screen.getByPlaceholderText('输入你的干饭昵称 (必填)'), '麻辣小王子');
  await user.click(screen.getByRole('button', { name: '进入干饭圈' }));

  return user;
}

describe('core product interactions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a proposal and shows it on the home screen', async () => {
    const user = await enterApp();

    await user.click(screen.getByRole('button', { name: '发起提案' }));
    await user.type(screen.getByPlaceholderText('例如：今晚去吃什么？'), '今晚一起吃烧烤？');
    await user.type(screen.getByPlaceholderText('店名/外卖名 (可选)'), '宿舍楼下烧烤摊');
    await user.click(screen.getByRole('button', { name: '发布提案' }));

    expect(screen.getByRole('heading', { name: '一起吃点啥' })).toBeInTheDocument();
    expect(screen.getByText('今晚一起吃烧烤？')).toBeInTheDocument();
  });

  it('lets users turn off vote/join settings, remove vote options, and keeps the tab bar visible on create screen', async () => {
    const user = await enterApp();

    await user.click(screen.getByRole('button', { name: '发起提案' }));

    expect(screen.getByRole('button', { name: '首页' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '转盘' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '历史' })).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: '开启投票' }));
    expect(screen.queryByText('添加选项')).not.toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: '开启投票' }));
    await user.click(screen.getByRole('button', { name: '添加选项' }));
    await user.type(screen.getByRole('textbox', { name: '投票选项 3' }), '麻辣烫');
    await user.click(screen.getByRole('button', { name: '删除投票选项 3' }));
    expect(screen.queryByRole('textbox', { name: '投票选项 3' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: '开启组队报名' }));
    expect(screen.queryByText('人数上限')).not.toBeInTheDocument();
  });

  it('supports voting, joining, and chatting inside proposal detail', async () => {
    const user = await enterApp();

    await user.click(screen.getByRole('button', { name: '查看详情 今晚一起吃沙县还是隆江猪脚饭？' }));

    await user.click(screen.getByRole('button', { name: '投票给 隆江猪脚饭' }));
    await user.click(screen.getByRole('button', { name: '提交投票' }));
    expect(screen.getByText('2票')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '我要去' }));
    expect(screen.getByText('参与小队 (4/4)')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('说点什么...'), '俺也去，顺便帮我带瓶可乐。');
    await user.click(screen.getByRole('button', { name: '发送消息' }));
    expect(screen.getByText('俺也去，顺便帮我带瓶可乐。')).toBeInTheDocument();
  });

  it('does not allow the proposal creator to leave their own team', async () => {
    const user = await enterApp();

    await user.click(screen.getByRole('button', { name: '发起提案' }));
    await user.type(screen.getByPlaceholderText('例如：今晚去吃什么？'), '发起人测试提案');
    await user.click(screen.getByRole('button', { name: '发布提案' }));
    await user.click(screen.getByRole('button', { name: '查看详情 发起人测试提案' }));

    const button = screen.getByRole('button', { name: '发起人不可退出' });
    expect(button).toBeDisabled();
  });

  it('publishes a food share and shows it in history', async () => {
    const user = await enterApp();

    await user.click(screen.getByRole('button', { name: '打开快捷菜单' }));
    await user.click(screen.getByRole('button', { name: '分享美食' }));

    await user.type(screen.getByPlaceholderText('美食名称（必填，如：原味冰拿铁）'), '深夜炸鸡套餐');
    await user.type(screen.getByPlaceholderText('商家店名 (可选)'), '楼下炸鸡');
    await user.type(screen.getByPlaceholderText('人均价格 ￥ (可选)'), '28');
    await user.type(
      screen.getByPlaceholderText('随便说点什么评价一下吧... 味道怎么样？环境好吗？'),
      '深夜党福音，趁热吃很顶。',
    );
    await user.click(screen.getByRole('button', { name: '发布分享' }));

    await user.click(screen.getByRole('button', { name: '历史' }));

    const history = screen.getByRole('main');
    expect(within(history).getByText('深夜炸鸡套餐')).toBeInTheDocument();
    expect(within(history).getByText('深夜党福音，趁热吃很顶。')).toBeInTheDocument();
  });

  it('supports wheel quick presets and plays sound when spinning', async () => {
    const user = await enterApp();
    const oscillator = { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { value: 0 } };
    const gainNode = { connect: vi.fn(), gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } };
    const audioContext = {
      createOscillator: vi.fn(() => oscillator),
      createGain: vi.fn(() => gainNode),
      destination: {},
      currentTime: 0,
      resume: vi.fn(),
    };

    vi.stubGlobal('AudioContext', vi.fn(() => audioContext));
    vi.stubGlobal('webkitAudioContext', vi.fn(() => audioContext));

    await user.click(screen.getByRole('button', { name: '转盘' }));
    await user.click(screen.getByRole('button', { name: '快捷导入 减肥套餐' }));

    expect(screen.getAllByText('鸡胸肉沙拉').length).toBeGreaterThan(0);
    expect(screen.getAllByText('玉米紫薯杯').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: '开始转盘' }));

    expect(audioContext.createOscillator).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('renders tangent wheel labels for the imported wheel options', async () => {
    const user = await enterApp();

    await user.click(screen.getByRole('button', { name: '转盘' }));
    await user.click(screen.getByRole('button', { name: '快捷导入 减肥套餐' }));

    expect(screen.getAllByTestId('wheel-label')).toHaveLength(5);
    expect(screen.getByText('鸡胸肉沙拉')).toBeInTheDocument();
    expect(screen.getByText('玉米紫薯杯')).toBeInTheDocument();
  });
});
