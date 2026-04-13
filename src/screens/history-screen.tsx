import { useAppStore } from '../app/store';
import { AppShell, BottomNav, ScreenScroller } from '../components/layout';
import { Avatar, SectionCard, ShareStars } from '../components/ui';

export function HistoryScreen() {
  const { state, actions } = useAppStore();

  return (
    <AppShell>
      <div className="absolute left-0 top-0 z-40 flex h-[88px] w-full items-end bg-white px-4 pb-3 shadow-sm">
        <div className="flex w-full items-center justify-center">
          <h2 className="text-lg font-bold">我的足迹</h2>
        </div>
      </div>

      <ScreenScroller className="px-0 pb-24 pt-[88px]">
        <div className="sticky top-0 z-30 flex border-b border-slate-100 bg-white px-4">
          {[
            { id: 'all', label: '全部' },
            { id: 'proposals', label: '参与的提案' },
            { id: 'shares', label: '我的分享' },
          ].map((tab) => {
            const active = state.historyFilter === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => actions.setHistoryFilter(tab.id as 'all' | 'proposals' | 'shares')}
                className={`flex-1 py-3 text-center text-sm ${active ? 'border-b-2 border-theme-600 font-bold text-theme-600' : 'text-slate-500'}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-4 p-4">
          {(state.historyFilter === 'all' || state.historyFilter === 'proposals') &&
            state.proposals.map((proposal) => (
              <SectionCard key={proposal.id} className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-400">历史提案</span>
                  <span className="text-xs text-slate-400">{proposal.historyLabel ?? proposal.createdLabel}</span>
                </div>
                <h3 className="mb-2 text-base font-bold text-slate-800">{proposal.title}</h3>
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-slate-50 p-2">
                  <span className="text-xs text-slate-500">最终决定:</span>
                  <span className="text-sm font-bold text-theme-600">
                    {proposal.finalResult ?? proposal.voteOptions[0]?.name ?? proposal.targetName ?? '待定'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex -space-x-1">
                    {proposal.teamMembers.slice(0, 3).map((member) => (
                      <Avatar key={member.nickname} seed={member.avatarSeed} className="h-5 w-5 border border-white" />
                    ))}
                    <span className="ml-2 text-xs text-slate-500">等{proposal.teamMembers.length}人参与</span>
                  </div>
                  <button type="button" onClick={() => actions.openProposal(proposal.id)} className="rounded-full border border-theme-500 px-3 py-1 text-xs text-theme-500">
                    再次发起
                  </button>
                </div>
              </SectionCard>
            ))}

          {(state.historyFilter === 'all' || state.historyFilter === 'shares') &&
            state.shares.map((share) => (
              <SectionCard key={share.id} className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <span className="rounded bg-orange-50 px-2 py-0.5 text-xs text-orange-500">我的分享</span>
                  <span className="text-xs text-slate-400">{share.sharedAtLabel}</span>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                    图
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 text-sm font-bold text-slate-800">{share.foodName}</h3>
                    <ShareStars rating={share.rating} />
                    <div className="mt-1 text-xs text-slate-500">{share.comment}</div>
                  </div>
                </div>
                <div className="mt-2 flex justify-end gap-2 border-t border-slate-50 pt-2">
                  <button type="button" className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500">
                    加入转盘
                  </button>
                  <button type="button" className="rounded-full border border-blue-500 px-3 py-1 text-xs text-blue-500">
                    引用为提案
                  </button>
                </div>
              </SectionCard>
            ))}

          <div className="mt-6 text-center text-xs text-slate-400">- 没有更多记录了 -</div>
        </div>
      </ScreenScroller>

      <BottomNav currentPage="history" onNavigate={actions.navigate} />
    </AppShell>
  );
}
