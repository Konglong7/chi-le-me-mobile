import { io, type Socket } from 'socket.io-client';
import type { Proposal, SharePost } from '../app/types';
import { getRemoteApiBaseUrl } from './api';

export interface RealtimeConnection {
  socket: Socket;
  joinProposalRoom: (proposalId: string) => void;
  leaveProposalRoom: (proposalId: string) => void;
  disconnect: () => void;
}

export function connectRealtimeSession({
  token,
  onProposal,
  onShare,
}: {
  token: string;
  onProposal: (proposal: Proposal) => void;
  onShare: (share: SharePost) => void;
}): RealtimeConnection | null {
  if (import.meta.env.MODE === 'test') {
    return null;
  }

  const baseUrl = getRemoteApiBaseUrl();

  if (!baseUrl) {
    return null;
  }

  const socket = io(baseUrl, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
  });

  socket.on('proposal:upsert', onProposal);
  socket.on('share:created', onShare);

  return {
    socket,
    joinProposalRoom: (proposalId: string) => socket.emit('proposal:join-room', { proposalId }),
    leaveProposalRoom: (proposalId: string) => socket.emit('proposal:leave-room', { proposalId }),
    disconnect: () => socket.disconnect(),
  };
}
