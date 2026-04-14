// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { canJoinProposalTeam } from './postgres-repository';

describe('postgres repository helpers', () => {
  it('blocks new joins when a proposal team is already full', () => {
    expect(
      canJoinProposalTeam({
        activeTeamCount: 2,
        maxPeople: 2,
        alreadyParticipating: false,
      }),
    ).toBe(false);

    expect(
      canJoinProposalTeam({
        activeTeamCount: 1,
        maxPeople: 2,
        alreadyParticipating: false,
      }),
    ).toBe(true);

    expect(
      canJoinProposalTeam({
        activeTeamCount: 2,
        maxPeople: 2,
        alreadyParticipating: true,
      }),
    ).toBe(true);
  });
});
