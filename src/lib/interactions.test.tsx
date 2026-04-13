import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
});
