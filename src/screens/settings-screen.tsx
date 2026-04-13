import { useEffect, useState } from 'react';
import { FaAngleLeft, FaAngleRight, FaPencil } from 'react-icons/fa6';
import { useAppStore } from '../app/store';
import { AppShell, BottomNav, ScreenScroller } from '../components/layout';
import { Avatar, PrimaryButton, SectionCard } from '../components/ui';

export function SettingsScreen() {
  const { state, actions } = useAppStore();
  const [nickname, setNickname] = useState(state.currentUser?.nickname ?? '');
  const [infoPanel, setInfoPanel] = useState<'none' | 'preferences' | 'about'>('none');

  useEffect(() => {
    setNickname(state.currentUser?.nickname ?? '');
  }, [state.currentUser?.nickname]);

  return (
    <AppShell>
      <div className="absolute left-0 top-0 z-40 flex h-[72px] w-full items-end bg-white px-4 pb-3 shadow-sm">
        <div className="flex w-full items-center justify-between">
          <button type="button" onClick={() => actions.navigate('home')} className="p-2 text-xl">
            <FaAngleLeft />
          </button>
          <h2 className="text-lg font-bold">个人设置</h2>
          <div className="w-8" />
        </div>
      </div>

      <ScreenScroller className="bg-slate-50 px-4 pb-[108px] pt-[88px]">
        <div className="mb-8 flex flex-col items-center pt-4">
          <div className="relative">
            <Avatar seed={state.currentUser?.avatarSeed ?? 'guest'} className="h-20 w-20 border-4 border-white shadow-md" />
            <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-theme-500 text-xs text-white">
              <FaPencil />
            </div>
          </div>
        </div>

        <SectionCard className="mb-6 overflow-hidden">
          <div className="border-b border-slate-50 p-4">
            <label className="mb-1 block text-xs text-slate-500">当前昵称</label>
            <div className="flex items-center justify-between gap-3">
              <input value={nickname} onChange={(event) => setNickname(event.target.value)} className="w-full text-lg font-bold text-slate-800 outline-none" />
              <FaPencil className="text-slate-300" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setInfoPanel((current) => (current === 'preferences' ? 'none' : 'preferences'))}
            className="flex w-full items-center justify-between p-4 text-sm text-slate-700 hover:bg-slate-50"
          >
            <span>偏好设置</span>
            <FaAngleRight className="text-slate-400" />
          </button>
          <button
            type="button"
            onClick={() => setInfoPanel((current) => (current === 'about' ? 'none' : 'about'))}
            className="flex w-full items-center justify-between border-t border-slate-50 p-4 text-sm text-slate-700 hover:bg-slate-50"
          >
            <span>关于应用</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">v1.0.0</span>
              <FaAngleRight className="text-slate-400" />
            </div>
          </button>
        </SectionCard>

        {infoPanel !== 'none' ? (
          <SectionCard className="mb-6 p-4 text-sm text-slate-600">
            {infoPanel === 'preferences'
              ? '偏好设置将继续扩展为口味偏好、忌口、外卖/到店优先级。当前版本先保留昵称和多人提案主流程。'
              : '吃了么 v1.0.0，定位为宿舍/朋友小圈子的干饭决策小工具，支持提案、投票、组队、聊天、转盘和分享。'}
          </SectionCard>
        ) : null}

        <PrimaryButton type="button" onClick={() => actions.updateNickname(nickname)} className="mb-4 w-full bg-theme-500">
          保存昵称
        </PrimaryButton>

        <button
          type="button"
          onClick={() => actions.logout()}
          className="w-full rounded-xl border border-red-100 bg-white py-3.5 text-sm font-bold text-red-500 shadow-sm"
        >
          清除本地信息并退出
        </button>
        <p className="mt-3 text-center text-xs text-slate-400">清除后下次进入需重新设置昵称</p>
      </ScreenScroller>

      <BottomNav currentPage="home" onNavigate={actions.navigate} />
    </AppShell>
  );
}
