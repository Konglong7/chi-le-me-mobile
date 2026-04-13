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

  switch (state.currentPage) {
    case 'welcome':
      return <WelcomeScreen />;
    case 'home':
      return <HomeScreen />;
    case 'create':
      return <CreateProposalScreen />;
    case 'proposal':
      return <ProposalDetailScreen />;
    case 'wheel':
      return <WheelScreen />;
    case 'share':
      return <ShareScreen />;
    case 'history':
      return <HistoryScreen />;
    case 'settings':
      return <SettingsScreen />;
    default:
      return <WelcomeScreen />;
  }
}

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
