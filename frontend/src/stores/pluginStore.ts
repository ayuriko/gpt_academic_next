import { create } from 'zustand';
import { PluginInfo } from '@/lib/types';

interface PluginState {
  plugins: Record<string, PluginInfo>;
  activeGroups: string[];
  setPlugins: (p: Record<string, PluginInfo>) => void;
  setActiveGroups: (g: string[]) => void;
}

export const usePluginStore = create<PluginState>((set) => ({
  plugins: {},
  activeGroups: ['对话', '编程', '学术', '智能体'],
  setPlugins: (p) => set({ plugins: p }),
  setActiveGroups: (g) => set({ activeGroups: g }),
}));
