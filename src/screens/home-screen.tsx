import { FaAngleRight, FaCameraRetro, FaDharmachakra, FaFlag, FaPlus } from 'react-icons/fa6';
import { useAppStore } from '../app/store';
import { AppShell, BottomNav, ScreenScroller } from '../components/layout';
import { ActionTile, Avatar, SharePreviewCard, StatusChip } from '../components/ui';

export function HomeScreen() {
  const { state, actions } = useAppStore();
  const proposals = state.proposals.filter((proposal) => proposal.status !== '已结束');

  return (
    <AppShell>
      <div className="absolute left-0 top-0 h-44 w-full rounded-b-[40px] bg-gradient-to-br from-theme-600 to-theme-500" />
      <div className="absolute left-1/2 top-0 h-56 w-full -translate-x-1/2 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_52%)]" />
      <ScreenScroller className="px-4 pt-16 pb-28">
        <div className="relative z-10 animate-fade-up">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.02em] text-white">一起吃点啥</h2>
            </div>
            <button
              type="button"
              onClick={() => actions.navigate('settings')}
              className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-sm text-white backdrop-blur transition active:scale-[0.98] tap-effect"
            >
              <Avatar seed={state.currentUser?.avatarSeed ?? 'guest'} className="h-6 w-6 bg-white" />
              <span className="font-medium">{state.currentUser?.nickname ?? '游客'}</span>
              <FaAngleRight className="text-xs text-white/70" />
            </button>
          </div>

          <div className="mb-6 flex gap-4">
            <ActionTile
              title="发起提案"
              subtitle="召集好友干饭"
              icon={<FaFlag className="text-lg text-blue-500" />}
              onClick={() => actions.navigate('create')}
            />
            <ActionTile
              title="幸运转盘"
              subtitle="选择困难救星"
              icon={<FaDharmachakra className="text-lg text-orange-500" />}
              onClick={() => actions.navigate('wheel')}
            />
          </div>

          <div className="mb-4 flex items-end justify-between">
            <div className="flex gap-4 border-b border-slate-200">
              <div className="border-b-2 border-theme-600 pb-2 text-lg font-bold text-theme-600">进行中</div>
              <div className="pb-2 text-lg font-medium text-slate-400">已结束</div>
            </div>
            <div className="flex gap-2">
              <span className="rounded-md bg-slate-200 px-2 py-1 text-xs text-slate-600">全部</span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-400">到店</span>
            </div>
          </div>

          <div className="mb-8 space-y-4">
            {proposals.map((proposal) => {
              const statusTone = proposal.status === '投票中' ? 'yellow' : proposal.status === '组队中' ? 'green' : 'red';
              const heroChip = proposal.proposalType === '外卖' ? 'blue' : 'purple';

              return (
                <div key={proposal.id} className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm app-panel tap-effect">
                  <div className="absolute right-0 top-0 rounded-bl-xl bg-white px-3 py-1">
                    <StatusChip tone={statusTone}>
                      {proposal.status === '组队中' ? `${proposal.status} (${proposal.teamMembers.length}/${proposal.maxPeople})` : proposal.status}
                    </StatusChip>
                  </div>
                  <div className="mb-3 flex items-start gap-3">
                    <Avatar seed={proposal.creatorAvatarSeed} className="h-10 w-10" />
                    <div className="pr-12">
                      <h3 className="text-base font-bold text-slate-800">{proposal.title}</h3>
                      <div className="mt-0.5 text-xs text-slate-400">
                        发起人: {proposal.creatorNickname} · {proposal.createdLabel}
                      </div>
                    </div>
                  </div>
                  <div className="mb-3 flex gap-2">
                    <StatusChip tone={heroChip as 'blue' | 'purple'}>{proposal.proposalType}</StatusChip>
                    <StatusChip>{proposal.eventLabel ?? proposal.expectedPeopleLabel ?? `预计${proposal.maxPeople}人`}</StatusChip>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                    <div className="flex -space-x-2">
                      {proposal.teamMembers.slice(0, 2).map((member) => (
                        <Avatar key={member.nickname} seed={member.avatarSeed} className="h-6 w-6 border-2 border-white" />
                      ))}
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] text-slate-500">
                        +{Math.max(proposal.teamMembers.length, 2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {proposal.status !== '投票中' ? (
                        <button
                          type="button"
                          onClick={() => actions.toggleJoin(proposal.id)}
                          className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-bold text-slate-800"
                        >
                          我要去
                        </button>
                      ) : null}
                      <button
                        type="button"
                        aria-label={`查看详情 ${proposal.title}`}
                        onClick={() => actions.openProposal(proposal.id)}
                        className="rounded-full bg-theme-500 px-4 py-1.5 text-sm font-bold text-white shadow-md shadow-red-500/20"
                      >
                        查看详情
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mb-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">最近分享</h3>
              <button type="button" className="text-xs text-slate-400" onClick={() => actions.navigate('history')}>
                查看更多 <FaAngleRight className="inline" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
              {state.shares.slice(0, 3).map((share) => (
                <SharePreviewCard key={share.id} share={share} />
              ))}
            </div>
          </div>
        </div>
      </ScreenScroller>

      <div className="absolute bottom-[100px] right-4 z-50 flex flex-col items-end">
        {state.fabOpen ? (
          <div className="mb-3 w-36 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl animate-soft-pop">
            <button
              type="button"
              onClick={() => actions.navigate('create')}
              className="flex w-full items-center gap-2 rounded-xl p-3 text-sm font-medium text-slate-700 hover:bg-slate-50 tap-effect"
            >
              <FaFlag className="w-5 text-center text-blue-500" /> 发起提案
            </button>
            <div className="mx-2 h-px bg-slate-100" />
            <button
              type="button"
              onClick={() => actions.navigate('share')}
              className="flex w-full items-center gap-2 rounded-xl p-3 text-sm font-medium text-slate-700 hover:bg-slate-50 tap-effect"
            >
              <FaCameraRetro className="w-5 text-center text-orange-500" /> 分享美食
            </button>
          </div>
        ) : null}
        <button
          type="button"
          aria-label="打开快捷菜单"
          onClick={() => actions.toggleFab()}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-theme-600 to-theme-400 text-2xl text-white shadow-[0_8px_20px_rgba(239,68,68,0.4)] transition active:scale-[0.98] tap-effect"
        >
          {state.fabOpen ? '×' : <FaPlus />}
        </button>
      </div>

      <BottomNav currentPage="home" onNavigate={actions.navigate} />
    </AppShell>
  );
}
