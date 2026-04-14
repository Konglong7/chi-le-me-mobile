export type AppPage =
  | 'welcome'
  | 'home'
  | 'create'
  | 'proposal'
  | 'wheel'
  | 'share'
  | 'history'
  | 'settings';

export type ProposalType = '到店' | '外卖' | '随机征集';
export type ProposalStatus = '投票中' | '组队中' | '已成团' | '已结束';
export type VoteMode = 'single' | 'multiple';
export type HistoryFilter = 'all' | 'proposals' | 'shares';

export interface AppUser {
  nickname: string;
  avatarSeed: string;
}

export interface TeamMember {
  nickname: string;
  avatarSeed: string;
  isCreator?: boolean;
}

export interface VoteOption {
  id: string;
  name: string;
  voterNicknames: string[];
}

export interface ChatMessage {
  id: string;
  nickname: string;
  avatarSeed: string;
  content: string;
}

export interface Proposal {
  id: string;
  title: string;
  creatorNickname: string;
  creatorAvatarSeed: string;
  createdLabel: string;
  proposalType: ProposalType;
  status: ProposalStatus;
  eventLabel?: string;
  expectedPeopleLabel?: string;
  targetName?: string;
  address?: string;
  remark?: string;
  voteEnabled: boolean;
  joinEnabled: boolean;
  voteMode: VoteMode;
  voteOptions: VoteOption[];
  teamMembers: TeamMember[];
  maxPeople: number;
  chatMessages: ChatMessage[];
  historyLabel?: string;
  finalResult?: string;
}

export interface SharePost {
  id: string;
  foodName: string;
  shopName?: string;
  price?: string;
  address?: string;
  rating: number;
  comment?: string;
  sharedBy: string;
  sharedAvatarSeed: string;
  sharedAtLabel: string;
}

export interface WheelOption {
  id: string;
  name: string;
}

export interface PersistedState {
  currentUser: AppUser | null;
  proposals: Proposal[];
  shares: SharePost[];
  wheelOptions: WheelOption[];
  sessionToken: string | null;
  deviceId: string | null;
}

export interface AppStoreState extends PersistedState {
  currentPage: AppPage;
  activeProposalId: string | null;
  fabOpen: boolean;
  historyFilter: HistoryFilter;
  wheelResult: string | null;
  wheelRotation: number;
  transientError: string | null;
}

export interface CreateProposalInput {
  title: string;
  proposalType: ProposalType;
  targetName: string;
  eventLabel: string;
  maxPeople: number;
  voteEnabled: boolean;
  joinEnabled: boolean;
  voteOptions: string[];
}

export interface CreateShareInput {
  foodName: string;
  shopName: string;
  price: string;
  address: string;
  rating: number;
  comment: string;
}
