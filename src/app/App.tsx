import { AppProvider, useAppStore } from './store';
import { CreateProposalScreen } from '../screens/create-proposal-screen';
import { HistoryScreen } from '../screens/history-screen';
import { HomeScreen } from '../screens/home-screen';
import { ProposalDetailScreen } from '../screens/proposal-detail-screen';
import { SettingsScreen } from '../screens/settings-screen';
import { ShareScreen } from '../screens/share-screen';
import { WelcomeScreen } from '../screens/welcome-screen';
import { WheelScreen } from '../screens/wheel-screen';

function AppContent() {
  const { state } = useAppStore();

  let screen = <WelcomeScreen />;

  switch (state.currentPage) {
    case 'welcome':
      screen = <WelcomeScreen />;
      break;
    case 'home':
      screen = <HomeScreen />;
      break;
    case 'create':
      screen = <CreateProposalScreen />;
      break;
    case 'proposal':
      screen = <ProposalDetailScreen />;
      break;
    case 'wheel':
      screen = <WheelScreen />;
      break;
    case 'share':
      screen = <ShareScreen />;
      break;
    case 'history':
      screen = <HistoryScreen />;
      break;
    case 'settings':
      screen = <SettingsScreen />;
      break;
    default:
      screen = <WelcomeScreen />;
      break;
  }

  return (
    <>
      {screen}
      {state.transientError ? (
        <div className="pointer-events-none fixed left-1/2 top-4 z-[120] w-[calc(100%-2rem)] max-w-[398px] -translate-x-1/2">
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50/95 px-4 py-3 text-sm font-medium text-red-700 shadow-lg backdrop-blur"
          >
            {state.transientError}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
