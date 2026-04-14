// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createMemoryRepository } from './repository';

describe('memory repository behavior', () => {
  it('keeps creator identity consistent after nickname changes', async () => {
    const repository = createMemoryRepository();
    const originalSession = await repository.identifySession({
      deviceId: 'memory-owner',
      nickname: '旧昵称',
    });

    const proposal = await repository.createProposal(originalSession.sessionToken, {
      title: '改名一致性测试',
      proposalType: '到店',
      targetName: '火锅',
      eventLabel: '今晚 19:00',
      maxPeople: 3,
      voteEnabled: false,
      joinEnabled: true,
      voteOptions: ['火锅'],
    });

    const renamedSession = await repository.identifySession({
      deviceId: 'memory-owner',
      nickname: '新昵称',
    });

    const afterRename = await repository.getProposal(renamedSession.sessionToken, proposal!.id);
    expect(afterRename?.creatorNickname).toBe('新昵称');
    expect(afterRename?.teamMembers.map((member) => member.nickname)).toEqual(['新昵称']);

    const afterToggle = await repository.toggleParticipation(renamedSession.sessionToken, proposal!.id);
    expect(afterToggle?.teamMembers.map((member) => member.nickname)).toEqual(['新昵称']);
  });
});
