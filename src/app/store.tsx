import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  createProposalRemote,
  createShareRemote,
  getBootstrap,
  getProposalRemote,
  identifySession,
  isRemoteModeEnabled,
  sendMessageRemote,
  submitVoteRemote,
  toggleParticipationRemote,
} from '../lib/api';
import { getOrCreateDeviceId } from '../lib/device';
import { connectRealtimeSession, type RealtimeConnection } from '../lib/realtime';
import { loadPersistedState, savePersistedState } from '../lib/storage';
import { calculateTargetWheelRotation } from '../lib/wheel';
import type {
  AppPage,
  AppStoreState,
  AppUser,
  CreateProposalInput,
  CreateShareInput,
  HistoryFilter,
  PersistedState,
  Proposal,
  ProposalStatus,
  SharePost,
  TeamMember,
  WheelOption,
} from './types';

type Action =
  | { type: 'navigate'; page: AppPage }
  | { type: 'openProposal'; proposalId: string }
  | { type: 'enter'; nickname: string }
  | { type: 'updateNickname'; nickname: string }
  | { type: 'toggleFab' }
  | { type: 'closeFab' }
  | { type: 'createProposal'; payload: CreateProposalInput }
  | { type: 'submitVote'; proposalId: string; optionId: string }
  | { type: 'toggleJoin'; proposalId: string }
  | { type: 'sendMessage'; proposalId: string; content: string }
  | { type: 'addShare'; payload: CreateShareInput }
  | { type: 'setHistoryFilter'; filter: HistoryFilter }
  | { type: 'addWheelOption'; name: string }
  | { type: 'addWheelOptions'; names: string[] }
  | { type: 'removeWheelOption'; optionId: string }
  | { type: 'clearWheelOptions' }
  | { type: 'importWheelOptions' }
  | { type: 'spinWheel' }
  | { type: 'hydrateRemote'; payload: PersistedState }
  | {
      type: 'upsertProposal';
      proposal: Proposal;
      currentPage?: AppPage;
      activeProposalId?: string | null;
    }
  | { type: 'prependShare'; share: SharePost }
  | { type: 'logout' };

interface AppStoreValue {
  state: AppStoreState;
  actions: {
    navigate: (page: AppPage) => void;
    openProposal: (proposalId: string) => void;
    enter: (nickname: string) => void;
    updateNickname: (nickname: string) => void;
    toggleFab: () => void;
    closeFab: () => void;
    createProposal: (payload: CreateProposalInput) => void;
    submitVote: (proposalId: string, optionId: string) => void;
    toggleJoin: (proposalId: string) => void;
    sendMessage: (proposalId: string, content: string) => void;
    addShare: (payload: CreateShareInput) => void;
    setHistoryFilter: (filter: HistoryFilter) => void;
    addWheelOption: (name: string) => void;
    addWheelOptions: (names: string[]) => void;
    removeWheelOption: (optionId: string) => void;
    clearWheelOptions: () => void;
    importWheelOptions: () => void;
    spinWheel: () => void;
    logout: () => void;
  };
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

function createInitialState(): AppStoreState {
  const persisted = loadPersistedState();

  return {
    ...persisted,
    currentPage: persisted.currentUser ? 'home' : 'welcome',
    activeProposalId: persisted.proposals[0]?.id ?? null,
    fabOpen: false,
    historyFilter: 'all',
    wheelResult: null,
    wheelRotation: 45,
  };
}

function createAvatarSeed(nickname: string) {
  return nickname || 'guest';
}

function createStatus(proposal: Proposal): ProposalStatus {
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

function createTeamMember(nickname: string): TeamMember {
  return {
    nickname,
    avatarSeed: createAvatarSeed(nickname),
  };
}

function persistableState(state: AppStoreState): PersistedState {
  return {
    currentUser: state.currentUser,
    proposals: state.proposals,
    shares: state.shares,
    wheelOptions: state.wheelOptions,
    sessionToken: state.sessionToken,
    deviceId: state.deviceId,
  };
}

function appReducer(state: AppStoreState, action: Action): AppStoreState {
  switch (action.type) {
    case 'navigate':
      return {
        ...state,
        currentPage: action.page,
        fabOpen: false,
      };

    case 'openProposal':
      return {
        ...state,
        currentPage: 'proposal',
        activeProposalId: action.proposalId,
        fabOpen: false,
      };

    case 'enter': {
      const currentUser: AppUser = {
        nickname: action.nickname.trim(),
        avatarSeed: createAvatarSeed(action.nickname.trim()),
      };

      return {
        ...state,
        currentUser,
        currentPage: 'home',
      };
    }

    case 'hydrateRemote':
      return {
        ...state,
        ...action.payload,
        currentPage: 'home',
        activeProposalId: action.payload.proposals[0]?.id ?? state.activeProposalId,
      };

    case 'updateNickname': {
      if (!state.currentUser) {
        return state;
      }

      return {
        ...state,
        currentUser: {
          nickname: action.nickname.trim(),
          avatarSeed: createAvatarSeed(action.nickname.trim()),
        },
      };
    }

    case 'toggleFab':
      return {
        ...state,
        fabOpen: !state.fabOpen,
      };

    case 'closeFab':
      return {
        ...state,
        fabOpen: false,
      };

    case 'createProposal': {
      if (!state.currentUser) {
        return state;
      }

      const nextProposal: Proposal = {
        id: `proposal-${Date.now()}`,
        title: action.payload.title.trim(),
        creatorNickname: state.currentUser.nickname,
        creatorAvatarSeed: state.currentUser.avatarSeed,
        createdLabel: '刚刚',
        proposalType: action.payload.proposalType,
        status: action.payload.voteEnabled && action.payload.voteOptions.length > 1 ? '投票中' : '组队中',
        eventLabel: action.payload.eventLabel.trim() || '今天 18:30',
        expectedPeopleLabel: `预计${action.payload.maxPeople}人`,
        targetName: action.payload.targetName.trim(),
        remark: '新提案已发布，快来表态。',
        voteEnabled: action.payload.voteEnabled,
        joinEnabled: action.payload.joinEnabled,
        voteMode: 'single',
        voteOptions: action.payload.voteEnabled
          ? action.payload.voteOptions
          .filter((item) => item.trim().length > 0)
          .map((item, index) => ({
            id: `proposal-option-${Date.now()}-${index}`,
            name: item.trim(),
            voterNicknames: [],
          }))
          : [],
        teamMembers: action.payload.joinEnabled ? [createTeamMember(state.currentUser.nickname)] : [],
        maxPeople: action.payload.maxPeople,
        chatMessages: [],
        historyLabel: '刚刚',
      };

      return {
        ...state,
        proposals: [nextProposal, ...state.proposals],
        currentPage: 'home',
        activeProposalId: nextProposal.id,
      };
    }

    case 'submitVote': {
      const currentUser = state.currentUser;

      if (!currentUser) {
        return state;
      }

      return {
        ...state,
        proposals: state.proposals.map((proposal) => {
          if (proposal.id !== action.proposalId || !proposal.voteEnabled) {
            return proposal;
          }

          const nextOptions = proposal.voteOptions.map((option) => ({
            ...option,
            voterNicknames: option.voterNicknames.filter((nickname) => nickname !== currentUser.nickname),
          }));

          const selected = nextOptions.find((option) => option.id === action.optionId);

          if (selected) {
            selected.voterNicknames = [...selected.voterNicknames, currentUser.nickname];
          }

          return {
            ...proposal,
            voteOptions: nextOptions,
          };
        }),
      };
    }

    case 'toggleJoin': {
      const currentUser = state.currentUser;

      if (!currentUser) {
        return state;
      }

      return {
        ...state,
        proposals: state.proposals.map((proposal) => {
          if (proposal.id !== action.proposalId || !proposal.joinEnabled || proposal.creatorNickname === currentUser.nickname) {
            return proposal;
          }

          const joined = proposal.teamMembers.some((member) => member.nickname === currentUser.nickname);

          const nextTeamMembers = joined
            ? proposal.teamMembers.filter((member) => member.nickname !== currentUser.nickname)
            : [...proposal.teamMembers, createTeamMember(currentUser.nickname)].slice(0, proposal.maxPeople);

          return {
            ...proposal,
            teamMembers: nextTeamMembers,
            status: createStatus({
              ...proposal,
              teamMembers: nextTeamMembers,
            }),
          };
        }),
      };
    }

    case 'sendMessage': {
      const currentUser = state.currentUser;

      if (!currentUser || action.content.trim().length === 0) {
        return state;
      }

      return {
        ...state,
        proposals: state.proposals.map((proposal) => {
          if (proposal.id !== action.proposalId) {
            return proposal;
          }

          return {
            ...proposal,
            chatMessages: [
              ...proposal.chatMessages,
              {
                id: `chat-${Date.now()}`,
                nickname: currentUser.nickname,
                avatarSeed: currentUser.avatarSeed,
                content: action.content.trim(),
              },
            ],
          };
        }),
      };
    }

    case 'addShare': {
      const currentUser = state.currentUser;

      if (!currentUser || action.payload.foodName.trim().length === 0) {
        return state;
      }

      return {
        ...state,
        shares: [
          {
            id: `share-${Date.now()}`,
            foodName: action.payload.foodName.trim(),
            shopName: action.payload.shopName.trim(),
            price: action.payload.price.trim(),
            address: action.payload.address.trim(),
            rating: action.payload.rating,
            comment: action.payload.comment.trim(),
            sharedBy: currentUser.nickname,
            sharedAvatarSeed: currentUser.avatarSeed,
            sharedAtLabel: '刚刚',
          },
          ...state.shares,
        ],
        currentPage: 'history',
        historyFilter: 'shares',
      };
    }

    case 'setHistoryFilter':
      return {
        ...state,
        historyFilter: action.filter,
      };

    case 'addWheelOption': {
      const name = action.name.trim();

      if (!name) {
        return state;
      }

      const nextOption: WheelOption = {
        id: `wheel-${Date.now()}`,
        name,
      };

      return {
        ...state,
        wheelOptions: [...state.wheelOptions, nextOption],
      };
    }

    case 'addWheelOptions': {
      const cleanNames = action.names.map((name) => name.trim()).filter(Boolean);

      if (cleanNames.length === 0) {
        return state;
      }

      const existing = new Set(state.wheelOptions.map((option) => option.name));
      const nextOptions = cleanNames
        .filter((name) => !existing.has(name))
        .map((name, index) => ({
          id: `wheel-batch-${Date.now()}-${index}`,
          name,
        }));

      return {
        ...state,
        wheelOptions: [...state.wheelOptions, ...nextOptions],
      };
    }

    case 'removeWheelOption':
      return {
        ...state,
        wheelOptions: state.wheelOptions.filter((option) => option.id !== action.optionId),
      };

    case 'clearWheelOptions':
      return {
        ...state,
        wheelOptions: [],
        wheelResult: null,
      };

    case 'importWheelOptions': {
      const importedNames = [...state.shares.map((share) => share.foodName), ...state.proposals.map((proposal) => proposal.title)];

      return {
        ...state,
        wheelOptions: importedNames.map((name, index) => ({
          id: `wheel-import-${index}`,
          name,
        })),
      };
    }

    case 'upsertProposal': {
      const exists = state.proposals.some((proposal) => proposal.id === action.proposal.id);

      return {
        ...state,
        proposals: exists
          ? state.proposals.map((proposal) => (proposal.id === action.proposal.id ? action.proposal : proposal))
          : [action.proposal, ...state.proposals],
        currentPage: action.currentPage ?? state.currentPage,
        activeProposalId: action.activeProposalId ?? state.activeProposalId,
      };
    }

    case 'prependShare':
      return {
        ...state,
        shares: state.shares.some((share) => share.id === action.share.id)
          ? state.shares.map((share) => (share.id === action.share.id ? action.share : share))
          : [action.share, ...state.shares],
        currentPage: state.currentPage === 'share' ? 'history' : state.currentPage,
        historyFilter: state.currentPage === 'share' ? 'shares' : state.historyFilter,
      };

    case 'spinWheel': {
      if (state.wheelOptions.length === 0) {
        return state;
      }

      const index = Math.floor(Math.random() * state.wheelOptions.length);
      const result = state.wheelOptions[index];

      return {
        ...state,
        wheelResult: result.name,
        wheelRotation: calculateTargetWheelRotation({
          currentRotation: state.wheelRotation,
          optionCount: state.wheelOptions.length,
          targetIndex: index,
        }),
      };
    }

    case 'logout':
      return {
        ...state,
        currentUser: null,
        sessionToken: null,
        deviceId: null,
        currentPage: 'welcome',
        fabOpen: false,
        activeProposalId: state.proposals[0]?.id ?? null,
      };

    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);
  const remoteEnabled = isRemoteModeEnabled();
  const didBootstrapRemote = useRef(false);
  const realtimeRef = useRef<RealtimeConnection | null>(null);

  useEffect(() => {
    savePersistedState(persistableState(state));
  }, [state.currentUser, state.proposals, state.shares, state.wheelOptions, state.sessionToken, state.deviceId]);

  useEffect(() => {
    if (!remoteEnabled || !state.sessionToken || didBootstrapRemote.current) {
      return;
    }

    didBootstrapRemote.current = true;

    void getBootstrap(state.sessionToken)
      .then((payload) => {
        dispatch({
          type: 'hydrateRemote',
          payload: {
            ...payload,
            sessionToken: state.sessionToken,
            deviceId: state.deviceId,
          },
        });
      })
      .catch(() => {
        dispatch({ type: 'logout' });
      });
  }, [remoteEnabled, state.sessionToken, state.deviceId]);

  useEffect(() => {
    if (!remoteEnabled || !state.sessionToken) {
      realtimeRef.current?.disconnect();
      realtimeRef.current = null;
      return;
    }

    realtimeRef.current?.disconnect();
    realtimeRef.current = connectRealtimeSession({
      token: state.sessionToken,
      onProposal: (proposal) => {
        dispatch({
          type: 'upsertProposal',
          proposal,
        });
      },
      onShare: (share) => {
        dispatch({
          type: 'prependShare',
          share,
        });
      },
    });

    return () => {
      realtimeRef.current?.disconnect();
      realtimeRef.current = null;
    };
  }, [remoteEnabled, state.sessionToken]);

  useEffect(() => {
    if (!realtimeRef.current || !state.activeProposalId || state.currentPage !== 'proposal') {
      return;
    }

    const proposalId = state.activeProposalId;

    realtimeRef.current.joinProposalRoom(proposalId);

    return () => {
      realtimeRef.current?.leaveProposalRoom(proposalId);
    };
  }, [state.currentPage, state.activeProposalId]);

  return (
    <AppStoreContext.Provider
      value={{
        state,
        actions: {
          navigate: (page) => dispatch({ type: 'navigate', page }),
          openProposal: (proposalId) => {
            if (!remoteEnabled || !state.sessionToken) {
              dispatch({ type: 'openProposal', proposalId });
              return;
            }

            void getProposalRemote(state.sessionToken, proposalId)
              .then((proposal) => {
                dispatch({
                  type: 'upsertProposal',
                  proposal,
                  currentPage: 'proposal',
                  activeProposalId: proposalId,
                });
              })
              .catch(() => {
                dispatch({ type: 'openProposal', proposalId });
              });
          },
          enter: (nickname) => {
            if (!remoteEnabled) {
              dispatch({ type: 'enter', nickname });
              return;
            }

            const deviceId = getOrCreateDeviceId(state.deviceId);

            void identifySession(deviceId, nickname)
              .then(async (session) => {
                const payload = await getBootstrap(session.sessionToken);
                didBootstrapRemote.current = true;
                dispatch({
                  type: 'hydrateRemote',
                  payload: {
                    ...payload,
                    sessionToken: session.sessionToken,
                    deviceId,
                  },
                });
              })
              .catch(() => {
                dispatch({ type: 'enter', nickname });
              });
          },
          updateNickname: (nickname) => {
            if (!remoteEnabled || !state.deviceId) {
              dispatch({ type: 'updateNickname', nickname });
              return;
            }

            void identifySession(state.deviceId, nickname)
              .then(async (session) => {
                const payload = await getBootstrap(session.sessionToken);
                didBootstrapRemote.current = true;
                dispatch({
                  type: 'hydrateRemote',
                  payload: {
                    ...payload,
                    sessionToken: session.sessionToken,
                    deviceId: state.deviceId,
                  },
                });
              })
              .catch(() => {
                dispatch({ type: 'updateNickname', nickname });
              });
          },
          toggleFab: () => dispatch({ type: 'toggleFab' }),
          closeFab: () => dispatch({ type: 'closeFab' }),
          createProposal: (payload) => {
            if (!remoteEnabled || !state.sessionToken) {
              dispatch({ type: 'createProposal', payload });
              return;
            }

            void createProposalRemote(state.sessionToken, payload)
              .then((proposal) => {
                dispatch({
                  type: 'upsertProposal',
                  proposal,
                  currentPage: 'home',
                  activeProposalId: proposal.id,
                });
              })
              .catch(() => {
                dispatch({ type: 'createProposal', payload });
              });
          },
          submitVote: (proposalId, optionId) => {
            if (!remoteEnabled || !state.sessionToken) {
              dispatch({ type: 'submitVote', proposalId, optionId });
              return;
            }

            void submitVoteRemote(state.sessionToken, proposalId, optionId)
              .then((proposal) => {
                dispatch({
                  type: 'upsertProposal',
                  proposal,
                });
              })
              .catch(() => {
                dispatch({ type: 'submitVote', proposalId, optionId });
              });
          },
          toggleJoin: (proposalId) => {
            if (!remoteEnabled || !state.sessionToken) {
              dispatch({ type: 'toggleJoin', proposalId });
              return;
            }

            void toggleParticipationRemote(state.sessionToken, proposalId)
              .then((proposal) => {
                dispatch({
                  type: 'upsertProposal',
                  proposal,
                });
              })
              .catch(() => {
                dispatch({ type: 'toggleJoin', proposalId });
              });
          },
          sendMessage: (proposalId, content) => {
            if (!remoteEnabled || !state.sessionToken) {
              dispatch({ type: 'sendMessage', proposalId, content });
              return;
            }

            void sendMessageRemote(state.sessionToken, proposalId, content)
              .then((proposal) => {
                dispatch({
                  type: 'upsertProposal',
                  proposal,
                });
              })
              .catch(() => {
                dispatch({ type: 'sendMessage', proposalId, content });
              });
          },
          addShare: (payload) => {
            if (!remoteEnabled || !state.sessionToken) {
              dispatch({ type: 'addShare', payload });
              return;
            }

            void createShareRemote(state.sessionToken, payload)
              .then((share) => {
                dispatch({
                  type: 'prependShare',
                  share,
                });
              })
              .catch(() => {
                dispatch({ type: 'addShare', payload });
              });
          },
          setHistoryFilter: (filter) => dispatch({ type: 'setHistoryFilter', filter }),
          addWheelOption: (name) => dispatch({ type: 'addWheelOption', name }),
          addWheelOptions: (names) => dispatch({ type: 'addWheelOptions', names }),
          removeWheelOption: (optionId) => dispatch({ type: 'removeWheelOption', optionId }),
          clearWheelOptions: () => dispatch({ type: 'clearWheelOptions' }),
          importWheelOptions: () => dispatch({ type: 'importWheelOptions' }),
          spinWheel: () => dispatch({ type: 'spinWheel' }),
          logout: () => {
            didBootstrapRemote.current = false;
            dispatch({ type: 'logout' });
          },
        },
      }}
    >
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const value = useContext(AppStoreContext);

  if (!value) {
    throw new Error('useAppStore must be used inside AppProvider');
  }

  return value;
}
