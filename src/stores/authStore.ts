import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deriveApiUrl, type Credentials } from '@/api/greenApi';

type AuthState = {
  credentials: Credentials | null;
  setCredentials: (input: { idInstance: string; apiToken: string }) => void;
  clear: () => void;
};

/**
 * apiTokenInstance хранится только в localStorage этой вкладки и уходит напрямую
 * в GREEN-API — бэкенда, через который он мог бы утечь, у проекта нет.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      credentials: null,

      setCredentials: ({ idInstance, apiToken }) =>
        set({
          credentials: {
            idInstance,
            apiToken,
            apiUrl: deriveApiUrl(idInstance),
          },
        }),

      clear: () => set({ credentials: null }),
    }),
    {
      name: 'gamc.auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
