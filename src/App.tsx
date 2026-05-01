import Header from "./components/Header";
import Footer from "./components/Footer";
import JoinGate from "./components/JoinGate";
import LandingPage from "./components/LandingPage";
import RoomView from "./components/RoomView";
import { AppShellProvider, useAppShellContext } from "./context/AppShellContext";
import { RoomSessionProvider } from "./context/RoomSessionContext";

function AppContent() {
  const { screen } = useAppShellContext();

  return (
    <div className="app-shell">
      <Header />
      {screen === "landing" ? <LandingPage /> : null}
      {screen === "join" ? <JoinGate /> : null}
      {screen === "room" ? (
        <RoomSessionProvider>
          <RoomView />
        </RoomSessionProvider>
      ) : null}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AppShellProvider>
      <AppContent />
    </AppShellProvider>
  );
}
