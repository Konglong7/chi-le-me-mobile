// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createPostgresRepository } from './postgres-repository';

const databaseUrl = process.env.DATABASE_URL;
const shouldRun = process.env.RUN_PG_INTEGRATION === '1' && !!databaseUrl;
const suite = shouldRun ? describe : describe.skip;

suite('postgres repository integration', () => {
  it('persists normalized proposal, vote, participant, message, and share records', async () => {
    const repository = await createPostgresRepository(databaseUrl!);

    const session = await repository.identifySession({
      deviceId: `integration-${Date.now()}`,
      nickname: '数据库测试用户',
    });

    const created = await repository.createProposal(session.sessionToken, {
      title: '关系型提案',
      proposalType: '外卖',
      targetName: 'KFC',
      eventLabel: '今天 19:00',
      maxPeople: 3,
      voteOptions: ['KFC', '麦当劳'],
    });

    expect(created?.title).toBe('关系型提案');

    const voted = await repository.submitVote(session.sessionToken, created!.id, created!.voteOptions[1].id);
    expect(voted?.voteOptions[1].voterNicknames).toContain('数据库测试用户');

    const messaged = await repository.addMessage(session.sessionToken, created!.id, '关系型仓库消息');
    expect(messaged?.chatMessages.at(-1)?.content).toBe('关系型仓库消息');

    const shared = await repository.addShare(session.sessionToken, {
      foodName: '关系型炸鸡',
      shopName: '关系型店铺',
      price: '33',
      address: '宿舍门口',
      rating: 4,
      comment: '关系型评论',
    });

    expect(shared?.foodName).toBe('关系型炸鸡');
  });
});
