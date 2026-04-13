import type { CreateProposalInput, CreateShareInput, PersistedState, Proposal, SharePost } from '../app/types';

function resolveApiBaseUrl() {
  const runtimeValue = (globalThis as { __CHI_LE_ME_API_BASE_URL__?: string }).__CHI_LE_ME_API_BASE_URL__;
  const envValue = import.meta.env.VITE_API_BASE_URL as string | undefined;

  return (runtimeValue ?? envValue ?? '').trim();
}

export function getRemoteApiBaseUrl() {
  return resolveApiBaseUrl();
}

export function isRemoteModeEnabled() {
  return resolveApiBaseUrl().length > 0;
}

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const baseUrl = resolveApiBaseUrl();
  const headers = new Headers(init?.headers);

  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export interface IdentifySessionResponse {
  currentUser: PersistedState['currentUser'];
  sessionToken: string;
}

export interface BootstrapResponse {
  currentUser: PersistedState['currentUser'];
  proposals: Proposal[];
  shares: SharePost[];
  wheelOptions: PersistedState['wheelOptions'];
}

export function identifySession(deviceId: string, nickname: string) {
  return request<IdentifySessionResponse>('/api/sessions/identify', {
    method: 'POST',
    body: JSON.stringify({ deviceId, nickname }),
  });
}

export function getBootstrap(sessionToken: string) {
  return request<BootstrapResponse>('/api/bootstrap', undefined, sessionToken);
}

export function createProposalRemote(sessionToken: string, payload: CreateProposalInput) {
  return request<Proposal>(
    '/api/proposals',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    sessionToken,
  );
}

export function getProposalRemote(sessionToken: string, proposalId: string) {
  return request<Proposal>(`/api/proposals/${proposalId}`, undefined, sessionToken);
}

export function submitVoteRemote(sessionToken: string, proposalId: string, optionId: string) {
  return request<Proposal>(
    `/api/proposals/${proposalId}/vote`,
    {
      method: 'POST',
      body: JSON.stringify({ optionId }),
    },
    sessionToken,
  );
}

export function toggleParticipationRemote(sessionToken: string, proposalId: string) {
  return request<Proposal>(
    `/api/proposals/${proposalId}/participation/toggle`,
    {
      method: 'POST',
    },
    sessionToken,
  );
}

export function sendMessageRemote(sessionToken: string, proposalId: string, content: string) {
  return request<Proposal>(
    `/api/proposals/${proposalId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ content }),
    },
    sessionToken,
  );
}

export function createShareRemote(sessionToken: string, payload: CreateShareInput) {
  return request<SharePost>(
    '/api/shares',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    sessionToken,
  );
}
