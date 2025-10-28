import { create } from 'zustand';
import { WSEvent } from './websocket';

export type Session = {
  session_id: string;
  created_at: string;
  is_running?: boolean;
  message_count?: number;
};

export type StoreState = {
  sessions: Session[];
  currentSessionId: string | null;
  events: WSEvent[];
  isConnected: boolean;

  // Actions
  setSessions: (sessions: Session[]) => void;
  setCurrentSession: (sessionId: string | null) => void;
  addEvent: (event: WSEvent) => void;
  clearEvents: () => void;
  setConnected: (connected: boolean) => void;
  setEvents: (events: WSEvent[]) => void;
};

export const useStore = create<StoreState>((set) => ({
  sessions: [],
  currentSessionId: null,
  events: [],
  isConnected: false,

  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (sessionId) => set({ currentSessionId: sessionId, events: [] }),
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  clearEvents: () => set({ events: [] }),
  setConnected: (connected) => set({ isConnected: connected }),
  setEvents: (events) => set({ events }),
}));
