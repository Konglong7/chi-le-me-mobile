import { useState } from 'react';
import { FaAngleLeft, FaComments, FaPaperPlane, FaShareNodes } from 'react-icons/fa6';
import { useAppStore } from '../app/store';
import { AppShell, ScreenScroller } from '../components/layout';
import { Avatar, PrimaryButton, SectionCard, StatusChip } from '../components/ui';

export function ProposalDetailScreen() {
  const { state, actions } = useAppStore();
  const proposal = state.proposals.find((item) => item.id === state.activeProposalId) ?? state.proposals[0];
  const currentNickname = state.currentUser?.nickname ?? '';
  const initialVote = proposal.voteOptions.find((option) => option.voterNicknames.includes(currentNickname))?.id ?? proposal.voteOptions[0]?.id;
  const [draftVoteOptionId, setDraftVoteOptionId] = useState(initialVote);
  const [message, setMessage] = useState('');
  const joined = proposal.teamMembers.some((member) => member.nickname === currentNickname);

  return (
    <AppShell>
      <div className="absolute left-0 top-0 z-40 flex h-[88px] w-full items-end border-b border-slate-100 bg-white/90 px-4 pb-3 shadow-sm backdrop-blur">
        <div className="flex w-full items-center justify-between">
          <button type="button" onClick={() => actions.navigate('home')} className="p-2 text-xl">
            <FaAngleLeft />
          </button>
          <h2 className="max-w-[200px] truncate text-lg font-bold">{proposal.title}</h2>
          <button type="button" className="p-2 text-lg" aria-label="分享提案">
            <FaShareNodes />
          </button>
        </div>
      </div>

      <ScreenScroller className="bg-slate-50 px-0 pb-[92px] pt-[88px]">
        <div className="relative mb-4 rounded-b-3xl bg-white p-5 pt-6 shadow-sm">
          <div className="absolute right-4 top-4">
            <StatusChip tone={proposal.status === '投票中' ? 'yellow' : 'green'}>{proposal.status}</StatusChip>
          </div>
          <h1 className="mb-3 pr-16 text-xl font-bold text-slate-800">{proposal.title}</h1>
          <div className="mb-4 flex items-center gap-2">
            <Avatar seed={proposal.creatorAvatarSeed} className="h-6 w-6" />
            <span className="text-sm text-slate-600">{proposal.creatorNickname}</span>
            <span className="ml-2 text-xs text-slate-400">发起于 {proposal.createdLabel}</span>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <StatusChip tone={proposal.proposalType === '外卖' ? 'blue' : 'purple'}>{proposal.proposalType}</StatusChip>
            <StatusChip>{proposal.eventLabel ?? '待定'}</StatusChip>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-500">
            备注：{proposal.remark ?? '暂无备注'}
          </div>
        </div>

        <div className="mb-4 px-4">
          <SectionCard className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">方案投票 (单选)</h3>
              <span className="text-xs text-slate-400">
                已投 {proposal.voteOptions.filter((option) => option.voterNicknames.length > 0).length}/{proposal.voteOptions.length}
              </span>
            </div>
            <div className="space-y-3">
              {proposal.voteOptions.map((option) => {
                const selected = draftVoteOptionId === option.id;
                const countLabel = selected ? `${option.voterNicknames.length}票` : `${option.voterNicknames.length} 票`;

                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-label={`投票给 ${option.name}`}
                    onClick={() => setDraftVoteOptionId(option.id)}
                    className={`relative block w-full overflow-hidden rounded-xl border p-3 text-left ${
                      selected ? 'border-theme-500 bg-theme-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div
                      className={`absolute left-0 top-0 h-full ${selected ? 'bg-theme-100' : 'bg-slate-100'}`}
                      style={{
                        width: `${Math.max(option.voterNicknames.length, 1) * 33}%`,
                      }}
                    />
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg ${selected ? 'text-theme-500' : 'text-slate-300'}`}>{selected ? '◉' : '○'}</span>
                        <span className={selected ? 'text-sm font-bold text-theme-700' : 'text-sm text-slate-700'}>{option.name}</span>
                      </div>
                      <span className={selected ? 'text-sm font-bold text-theme-600' : 'text-sm text-slate-500'}>{countLabel}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <PrimaryButton
              type="button"
              onClick={() => {
                if (draftVoteOptionId) {
                  actions.submitVote(proposal.id, draftVoteOptionId);
                }
              }}
              className="mt-4 w-full border border-theme-200 bg-theme-50 text-theme-600 shadow-none"
            >
              提交投票
            </PrimaryButton>
          </SectionCard>
        </div>

        <div className="mb-4 px-4">
          <SectionCard className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">
                参与小队 ({proposal.teamMembers.length}/{proposal.maxPeople})
              </h3>
              <button
                type="button"
                onClick={() => actions.toggleJoin(proposal.id)}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
              >
                {joined ? '退出组队' : '我要去'}
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {proposal.teamMembers.map((member) => (
                <div key={member.nickname} className="flex flex-col items-center gap-1">
                  <Avatar
                    seed={member.avatarSeed}
                    className={`h-10 w-10 ${member.isCreator ? 'border-2 border-yellow-400 p-0.5' : ''}`}
                  />
                  <span className={`w-12 truncate text-center text-[10px] ${member.nickname === currentNickname ? 'font-bold text-slate-800' : 'text-slate-500'}`}>
                    {member.nickname === currentNickname ? '我' : member.nickname}
                  </span>
                </div>
              ))}
              {proposal.teamMembers.length < proposal.maxPeople ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-300">
                    +
                  </div>
                  <span className="text-[10px] text-slate-400">待加入</span>
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>

        <div className="px-4">
          <SectionCard className="flex h-64 flex-col p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
              <FaComments className="text-theme-500" /> 讨论板
            </h3>
            <div className="flex-1 space-y-3 overflow-y-auto pr-2">
              {proposal.chatMessages.map((chat) => {
                const mine = chat.nickname === currentNickname;

                return (
                  <div key={chat.id} className={`flex items-start gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                    <Avatar seed={chat.avatarSeed} className="h-8 w-8 flex-shrink-0" />
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        mine
                          ? 'rounded-tl-xl rounded-bl-xl bg-theme-500 text-white shadow-sm'
                          : 'rounded-tr-xl rounded-br-xl bg-slate-100 text-slate-800'
                      }`}
                    >
                      {chat.content}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </ScreenScroller>

      <div className="absolute bottom-0 left-0 z-50 flex w-full items-center gap-2 border-t border-slate-100 bg-white p-3 pb-8">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="说点什么..."
          className="flex-1 rounded-full bg-slate-100 px-4 py-2 text-sm outline-none"
        />
        <button
          type="button"
          aria-label="发送消息"
          onClick={() => {
            actions.sendMessage(proposal.id, message);
            setMessage('');
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-theme-500 text-white shadow-md"
        >
          <FaPaperPlane className="text-sm" />
        </button>
      </div>
    </AppShell>
  );
}
