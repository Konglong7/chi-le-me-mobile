import { useState } from 'react';
import { FaAngleLeft, FaCircleMinus, FaCirclePlus } from 'react-icons/fa6';
import { useAppStore } from '../app/store';
import type { ProposalType } from '../app/types';
import { AppShell, BottomNav, ScreenScroller } from '../components/layout';
import { PrimaryButton, SectionCard } from '../components/ui';

export function CreateProposalScreen() {
  const { actions } = useAppStore();
  const [title, setTitle] = useState('');
  const [proposalType, setProposalType] = useState<ProposalType>('到店');
  const [targetName, setTargetName] = useState('');
  const [eventLabel, setEventLabel] = useState('今天 18:30');
  const [maxPeople, setMaxPeople] = useState(4);
  const [voteEnabled, setVoteEnabled] = useState(true);
  const [joinEnabled, setJoinEnabled] = useState(true);
  const [voteOptions, setVoteOptions] = useState(['沙县小吃', '隆江猪脚饭']);
  const canPublish = title.trim().length > 0;

  const addVoteOption = () => setVoteOptions((current) => [...current, '']);
  const removeVoteOption = (index: number) =>
    setVoteOptions((current) => current.filter((_, currentIndex) => currentIndex !== index));

  return (
    <AppShell>
      <div className="absolute left-0 top-0 z-40 flex h-[72px] w-full items-end border-b border-slate-100 bg-white px-4 pb-3 shadow-sm">
        <div className="flex w-full items-center justify-between">
          <button type="button" onClick={() => actions.navigate('home')} className="p-2 text-xl">
            <FaAngleLeft />
          </button>
          <h2 className="text-lg font-bold">发起干饭提案</h2>
          <div className="w-8" />
        </div>
      </div>

      <ScreenScroller className="bg-slate-50 px-4 pb-[172px] pt-[88px]">
        <SectionCard className="mb-4 p-4">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-slate-700">
              提案标题 <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：今晚去吃什么？"
              className="w-full border-b border-slate-200 py-2 text-slate-800 outline-none focus:border-theme-500"
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-slate-700">
              提案类型 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              {(['到店', '外卖', '随机征集'] as ProposalType[]).map((type) => {
                const active = proposalType === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setProposalType(type)}
                    className={`flex-1 rounded-lg border py-2 text-sm ${
                      active
                        ? 'border-theme-200 bg-theme-50 font-medium text-theme-600'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-sm text-slate-600">目标名称</span>
              <input
                value={targetName}
                onChange={(event) => setTargetName(event.target.value)}
                placeholder="店名/外卖名 (可选)"
                className="w-48 text-right text-sm outline-none"
              />
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-sm text-slate-600">时间安排</span>
              <input
                value={eventLabel}
                onChange={(event) => setEventLabel(event.target.value)}
                className="w-32 text-right text-sm text-slate-500 outline-none"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard className="mb-4 p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-bold text-slate-800">开启投票</span>
            <button
              type="button"
              role="switch"
              aria-checked={voteEnabled}
              aria-label="开启投票"
              onClick={() => setVoteEnabled((current) => !current)}
              className={`relative h-6 w-11 rounded-full shadow-inner transition ${voteEnabled ? 'bg-theme-500' : 'bg-slate-200'}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                  voteEnabled ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {voteEnabled ? (
            <>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                {voteOptions.map((option, index) => (
                  <div
                    key={index}
                    className={index === 0 ? 'flex items-center gap-2' : 'flex items-center gap-2 border-t border-slate-200 pt-3'}
                  >
                    <button
                      type="button"
                      aria-label={`删除投票选项 ${index + 1}`}
                      onClick={() => removeVoteOption(index)}
                      className="text-red-400 disabled:cursor-not-allowed disabled:text-slate-300"
                      disabled={voteOptions.length <= 1}
                    >
                      <FaCircleMinus />
                    </button>
                    <input
                      aria-label={`投票选项 ${index + 1}`}
                      value={option}
                      onChange={(event) =>
                        setVoteOptions((current) => current.map((item, currentIndex) => (currentIndex === index ? event.target.value : item)))
                      }
                      className="flex-1 bg-transparent text-sm outline-none"
                    />
                  </div>
                ))}
                <button type="button" aria-label="添加选项" onClick={addVoteOption} className="mt-3 flex items-center gap-2 text-sm font-medium text-theme-500">
                  <FaCirclePlus /> 添加选项
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-slate-600">单选 / 多选</span>
                <span className="text-sm text-slate-800">单选</span>
              </div>
            </>
          ) : null}
        </SectionCard>

        <SectionCard className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-bold text-slate-800">开启组队报名</span>
            <button
              type="button"
              role="switch"
              aria-checked={joinEnabled}
              aria-label="开启组队报名"
              onClick={() => setJoinEnabled((current) => !current)}
              className={`relative h-6 w-11 rounded-full shadow-inner transition ${joinEnabled ? 'bg-theme-500' : 'bg-slate-200'}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                  joinEnabled ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {joinEnabled ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">人数上限</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMaxPeople((current) => Math.max(2, current - 1))}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                >
                  -
                </button>
                <span className="text-sm font-bold">{maxPeople}</span>
                <button
                  type="button"
                  onClick={() => setMaxPeople((current) => current + 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-theme-50 text-theme-600"
                >
                  +
                </button>
              </div>
            </div>
          ) : null}
        </SectionCard>
      </ScreenScroller>

      <div className="absolute bottom-[84px] left-0 z-50 w-full border-t border-slate-100 bg-white p-4">
        <PrimaryButton
          type="button"
          disabled={!canPublish}
          onClick={() =>
            actions.createProposal({
              title,
              proposalType,
              targetName,
              eventLabel,
              maxPeople,
              voteEnabled,
              joinEnabled,
              voteOptions,
            })
          }
          className="w-full py-3.5 text-lg disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {canPublish ? '发布提案' : '请输入提案标题'}
        </PrimaryButton>
      </div>

      <BottomNav currentPage="home" onNavigate={actions.navigate} />
    </AppShell>
  );
}
