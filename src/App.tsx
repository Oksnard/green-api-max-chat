import { ChatScreen } from '@/screens/ChatScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { useAuthStore } from '@/stores/authStore';

export function App() {
  const credentials = useAuthStore((state) => state.credentials);

  return (
    <div className="h-full">
      {credentials ? <ChatScreen credentials={credentials} /> : <LoginScreen />}
    </div>
  );
}
