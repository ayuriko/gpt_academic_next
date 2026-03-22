import { create } from 'zustand';
import { CoreFunction } from '@/lib/types';

interface SettingsState {
  llmModel: string;
  topP: number;
  temperature: number;
  maxLength: number | null;
  systemPrompt: string;
  darkMode: boolean;
  availModels: string[];
  coreFunctions: Record<string, CoreFunction>;

  setModel: (m: string) => void;
  setTopP: (v: number) => void;
  setTemperature: (v: number) => void;
  setMaxLength: (v: number | null) => void;
  setSystemPrompt: (s: string) => void;
  toggleDarkMode: () => void;
  setAvailModels: (models: string[]) => void;
  setCoreFunctions: (functions: Record<string, CoreFunction>) => void;
  loadFromStorage: () => void;
  persist: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  llmModel: 'gpt-5.4',
  topP: 1.0,
  temperature: 1.0,
  maxLength: null,
  systemPrompt: 'Serve me as a writing and programming assistant.',
  darkMode: true,
  availModels: [],
  coreFunctions: {},

  setModel: (m) => { set({ llmModel: m }); get().persist(); },
  setTopP: (v) => { set({ topP: v }); get().persist(); },
  setTemperature: (v) => { set({ temperature: v }); get().persist(); },
  setMaxLength: (v) => { set({ maxLength: v }); get().persist(); },
  setSystemPrompt: (s) => { set({ systemPrompt: s }); get().persist(); },
  toggleDarkMode: () => {
    set((s) => ({ darkMode: !s.darkMode }));
    get().persist();
  },
  setAvailModels: (models) => set({ availModels: models }),
  setCoreFunctions: (functions) => set({ coreFunctions: functions }),

  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('gpt_academic_settings');
      if (raw) {
        const saved = JSON.parse(raw);
        set({
          llmModel: saved.llmModel ?? 'gpt-5.4',
          topP: saved.topP ?? 1.0,
          temperature: saved.temperature ?? 1.0,
          maxLength: saved.maxLength ?? null,
          systemPrompt: saved.systemPrompt ?? 'Serve me as a writing and programming assistant.',
          darkMode: saved.darkMode ?? true,
        });
      }
    } catch { /* ignore */ }
  },

  persist: () => {
    if (typeof window === 'undefined') return;
    const { llmModel, topP, temperature, maxLength, systemPrompt, darkMode } = get();
    localStorage.setItem('gpt_academic_settings', JSON.stringify({
      llmModel, topP, temperature, maxLength, systemPrompt, darkMode,
    }));
  },
} as SettingsState));
