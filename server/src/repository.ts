import { randomUUID } from 'node:crypto';
import { createSeedState } from '../../src/app/seed';
import type {
  AppUser,
  CreateProposalInput,
  CreateShareInput,
  Proposal,
  SharePost,
  WheelOption,
} from '../../src/app/types';

export interface SessionPayload {
  currentUser: AppUser;
  sessionToken: string;
}

export interface BootstrapPayload {
  currentUser: AppUser;
  proposals: Proposal[];
  shares: SharePost[];
  wheelOptions: WheelOption[];
}

export interface AppRepository {
  identifySession(input: { deviceId: string; nickname: string }): Promise<SessionPayload>;
  authenticate(token: string): Promise<AppUser | null>;
  getBootstrap(token: string): Promise<BootstrapPayload | null>;
  createProposal(token: string, payload: CreateProposalInput): Promise<Proposal | null>;
  getProposal(token: string, proposalId: string): Promise<Proposal | null>;
  submitVote(token: string, proposalId: string, optionId: string): Promise<Proposal | null>;
  toggleParticipation(token: string, proposalId: string): Promise<Proposal | null>;
  addMessage(token: string, proposalId: string, content: string): Promise<Proposal | null>;
  addShare(token: string, payload: CreateShareInput): Promise<SharePost | null>;
  getHistory(token: string): Promise<{ proposals: Proposal[]; shares: SharePost[] } | null>;
}

interface StoredUser extends AppUser {
  id: string;
  deviceId: string;
}

function createAvatarSeed(nickname: string) {
  return nickname || 'guest';
}

function deriveStatus(proposal: Proposal): Proposal['status'] {
  if (!proposal.joinEnabled && !proposal.voteEnabled) {
    return '组队中';
  }

  if (proposal.teamMembers.length >= proposal.maxPeople) {
    return '已成团';
  }

  if (proposal.voteEnabled && proposal.voteOptions.length > 1) {
    return '投票中';
  }

  return '组队中';
}

function renameUserReferences(
  proposals: Proposal[],
  shares: SharePost[],
  previousNickname: string,
  nextNickname: string,
  nextAvatarSeed: string,
) {
  const nextProposals = proposals.map((proposal) => {
    const creatorRenamed = proposal.creatorNickname === previousNickname;

    return {
      ...proposal,
      creatorNickname: creatorRenamed ? nextNickname : proposal.creatorNickname,
      creatorAvatarSeed: creatorRenamed ? nextAvatarSeed : proposal.creatorAvatarSeed,
      voteOptions: proposal.voteOptions.map((option) => ({
        ...option,
        voterNicknames: option.voterNicknames.map((nickname) => (nickname === previousNickname ? nextNickname : nickname)),
      })),
      teamMembers: proposal.teamMembers.map((member) =>
        member.nickname === previousNickname
          ? {
              ...member,
              nickname: nextNickname,
              avatarSeed: nextAvatarSeed,
            }
          : member,
      ),
      chatMessages: proposal.chatMessages.map((message) =>
        message.nickname === previousNickname
          ? {
              ...message,
              nickname: nextNickname,
              avatarSeed: nextAvatarSeed,
            }
          : message,
      ),
    };
  });

  const nextShares = shares.map((share) =>
    share.sharedBy === previousNickname
      ? {
          ...share,
          sharedBy: nextNickname,
          sharedAvatarSeed: nextAvatarSeed,
        }
      : share,
  );

  return {
    proposals: nextProposals,
    shares: nextShares,
  };
}

export function createMemoryRepository(): AppRepository {
  const seed = createSeedState();
  const usersByDevice = new Map<string, StoredUser>();
  const sessions = new Map<string, string>();
  let proposals = structuredClone(seed.proposals);
  let shares = structuredClone(seed.shares);
  let wheelOptions = structuredClone(seed.wheelOptions);

  function userFromToken(token: string) {
    const userId = sessions.get(token);

    if (!userId) {
      return null;
    }

    return [...usersByDevice.values()].find((user) => user.id === userId) ?? null;
  }

  return {
    async identifySession({ deviceId, nickname }) {
      const cleanNickname = nickname.trim();
      let user = usersByDevice.get(deviceId);

      if (!user) {
        user = {
          id: randomUUID(),
          deviceId,
          nickname: cleanNickname,
          avatarSeed: createAvatarSeed(cleanNickname),
        };
        usersByDevice.set(deviceId, user);
      } else {
        const previousNickname = user.nickname;
        user.nickname = cleanNickname;
        user.avatarSeed = createAvatarSeed(cleanNickname);

        if (previousNickname !== cleanNickname) {
          const renamedState = renameUserReferences(proposals, shares, previousNickname, cleanNickname, user.avatarSeed);
          proposals = renamedState.proposals;
          shares = renamedState.shares;
        }
      }

      const sessionToken = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
      sessions.set(sessionToken, user.id);

      return {
        currentUser: {
          nickname: user.nickname,
          avatarSeed: user.avatarSeed,
        },
        sessionToken,
      };
    },

    async authenticate(token) {
      const user = userFromToken(token);

      if (!user) {
        return null;
      }

      return {
        nickname: user.nickname,
        avatarSeed: user.avatarSeed,
      };
    },

    async getBootstrap(token) {
      const user = await this.authenticate(token);

      if (!user) {
        return null;
      }

      return {
        currentUser: user,
        proposals,
        shares,
        wheelOptions,
      };
    },

    async createProposal(token, payload) {
      const user = userFromToken(token);

      if (!user) {
        return null;
      }

      const nextProposal: Proposal = {
        id: `proposal-${randomUUID()}`,
        title: payload.title.trim(),
        creatorNickname: user.nickname,
        creatorAvatarSeed: user.avatarSeed,
        createdLabel: '刚刚',
        proposalType: payload.proposalType,
        status: payload.voteEnabled && payload.voteOptions.filter((item) => item.trim()).length > 1 ? '投票中' : '组队中',
        eventLabel: payload.eventLabel.trim() || '今天 18:30',
        expectedPeopleLabel: `预计${payload.maxPeople}人`,
        targetName: payload.targetName.trim(),
        remark: '新提案已发布，快来表态。',
        voteEnabled: payload.voteEnabled,
        joinEnabled: payload.joinEnabled,
        voteMode: 'single',
        voteOptions: payload.voteEnabled
          ? payload.voteOptions
          .filter((item) => item.trim())
          .map((item) => ({
            id: `proposal-option-${randomUUID()}`,
            name: item.trim(),
            voterNicknames: [],
          }))
          : [],
        teamMembers: payload.joinEnabled
          ? [
          {
            nickname: user.nickname,
            avatarSeed: user.avatarSeed,
            isCreator: true,
          },
        ]
          : [],
        maxPeople: payload.maxPeople,
        chatMessages: [],
        historyLabel: '刚刚',
      };

      proposals = [nextProposal, ...proposals];

      return nextProposal;
    },

    async getProposal(token, proposalId) {
      const user = await this.authenticate(token);

      if (!user) {
        return null;
      }

      return proposals.find((proposal) => proposal.id === proposalId) ?? null;
    },

    async submitVote(token, proposalId, optionId) {
      const user = userFromToken(token);

      if (!user) {
        return null;
      }

      proposals = proposals.map((proposal) => {
        if (proposal.id !== proposalId || !proposal.voteEnabled) {
          return proposal;
        }

        return {
          ...proposal,
          voteOptions: proposal.voteOptions.map((option) => ({
            ...option,
            voterNicknames:
              option.id === optionId
                ? [...option.voterNicknames.filter((nickname) => nickname !== user.nickname), user.nickname]
                : option.voterNicknames.filter((nickname) => nickname !== user.nickname),
          })),
        };
      });

      return proposals.find((proposal) => proposal.id === proposalId) ?? null;
    },

    async toggleParticipation(token, proposalId) {
      const user = userFromToken(token);

      if (!user) {
        return null;
      }

      proposals = proposals.map((proposal) => {
        if (proposal.id !== proposalId || !proposal.joinEnabled || proposal.creatorNickname === user.nickname) {
          return proposal;
        }

        const joined = proposal.teamMembers.some((member) => member.nickname === user.nickname);
        const nextTeamMembers = joined
          ? proposal.teamMembers.filter((member) => member.nickname !== user.nickname)
          : [...proposal.teamMembers, { nickname: user.nickname, avatarSeed: user.avatarSeed }].slice(0, proposal.maxPeople);

        return {
          ...proposal,
          teamMembers: nextTeamMembers,
          status: deriveStatus({
            ...proposal,
            teamMembers: nextTeamMembers,
          }),
        };
      });

      return proposals.find((proposal) => proposal.id === proposalId) ?? null;
    },

    async addMessage(token, proposalId, content) {
      const user = userFromToken(token);

      if (!user) {
        return null;
      }

      proposals = proposals.map((proposal) => {
        if (proposal.id !== proposalId) {
          return proposal;
        }

        return {
          ...proposal,
          chatMessages: [
            ...proposal.chatMessages,
            {
              id: `chat-${randomUUID()}`,
              nickname: user.nickname,
              avatarSeed: user.avatarSeed,
              content: content.trim(),
            },
          ],
        };
      });

      return proposals.find((proposal) => proposal.id === proposalId) ?? null;
    },

    async addShare(token, payload) {
      const user = userFromToken(token);

      if (!user) {
        return null;
      }

      const share: SharePost = {
        id: `share-${randomUUID()}`,
        foodName: payload.foodName.trim(),
        shopName: payload.shopName.trim(),
        price: payload.price.trim(),
        address: payload.address.trim(),
        rating: payload.rating,
        comment: payload.comment.trim(),
        sharedBy: user.nickname,
        sharedAvatarSeed: user.avatarSeed,
        sharedAtLabel: '刚刚',
      };

      shares = [share, ...shares];
      wheelOptions = [{ id: `wheel-${randomUUID()}`, name: share.foodName }, ...wheelOptions];

      return share;
    },

    async getHistory(token) {
      const user = await this.authenticate(token);

      if (!user) {
        return null;
      }

      return {
        proposals,
        shares,
      };
    },
  };
}
