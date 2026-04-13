import { useState } from 'react';
import { FaShieldHalved, FaUser, FaUtensils } from 'react-icons/fa6';
import { useAppStore } from '../app/store';
import { AppShell, ScreenScroller } from '../components/layout';
import { PrimaryButton } from '../components/ui';

export function WelcomeScreen() {
  const { actions } = useAppStore();
  const [nickname, setNickname] = useState('');

  return (
    <AppShell>
      <ScreenScroller className="flex items-center justify-center bg-gradient-to-b from-theme-50 to-white px-8 pb-0">
        <div className="w-full animate-fade-up">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-tr from-theme-600 to-theme-400 text-white shadow-lg shadow-red-500/30 animate-soft-pop">
            <FaUtensils className="text-4xl" />
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-[-0.02em] text-slate-800">今天吃什么？</h1>
          <p className="mb-12 max-w-[270px] text-sm leading-6 text-slate-500">告别选择困难，和朋友一起愉快地决定干饭目标！</p>

          <div className="space-y-4">
            <label className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <FaUser />
              </span>
              <input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="输入你的干饭昵称 (必填)"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-11 pr-4 text-slate-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-theme-500 app-panel"
              />
            </label>
            <PrimaryButton
              type="button"
              onClick={() => {
                if (nickname.trim()) {
                  actions.enter(nickname);
                }
              }}
              className="w-full rounded-2xl bg-gradient-to-r from-theme-600 to-theme-400 py-4 text-lg"
            >
              进入干饭圈
            </PrimaryButton>
            <p className="mt-4 flex items-center justify-center gap-1 text-center text-xs text-slate-400">
              <FaShieldHalved />
              首次输入后保存在本地，下次自动进入
            </p>
          </div>
        </div>
      </ScreenScroller>
    </AppShell>
  );
}
