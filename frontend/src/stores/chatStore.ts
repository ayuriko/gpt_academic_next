import { create } from 'zustand';
import { Conversation, UploadResult } from '@/lib/types';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface SelectedTool {
  name: string;
  args?: Record<string, string>;
}

interface ChatState {
  conversations: Conversation[];
  activeId: string | null;
  isStreaming: boolean;
  draftInput: string;
  abortCurrent: (() => void) | null;
  selectedTool: SelectedTool | null;
  selectedCoreFunction: string | null;
  attachedUpload: UploadResult | null;

  createConversation: () => string;
  setActive: (id: string | null) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  addUserMessage: (content: string) => void;
  appendBotChunk: (chatbot: [string | null, string | null][], history: string[]) => void;
  setStreaming: (v: boolean) => void;
  setDraftInput: (value: string) => void;
  setAbortCurrent: (handler: (() => void) | null) => void;
  setSelectedTool: (tool: SelectedTool | null) => void;
  clearSelectedTool: () => void;
  setSelectedCoreFunction: (fnName: string | null) => void;
  clearSelectedCoreFunction: () => void;
  setAttachedUpload: (upload: UploadResult | null) => void;
  clearAttachedUpload: () => void;
  getActiveConversation: () => Conversation | undefined;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeId: null,
  isStreaming: false,
  draftInput: '',
  abortCurrent: null,
  selectedTool: null,
  selectedCoreFunction: null,
  attachedUpload: null,

  createConversation: () => {
    const id = generateId();
    const conv: Conversation = {
      id,
      title: '新对话',
      chatbot: [],
      history: [],
      systemPrompt: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((s) => ({
      conversations: [conv, ...s.conversations],
      activeId: id,
    }));
    get().saveToStorage();
    return id;
  },

  setActive: (id) => set({ activeId: id }),

  deleteConversation: (id) => {
    set((s) => {
      const convs = s.conversations.filter((c) => c.id !== id);
      return {
        conversations: convs,
        activeId: s.activeId === id ? (convs[0]?.id || null) : s.activeId,
      };
    });
    get().saveToStorage();
  },

  renameConversation: (id, title) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, title } : c
      ),
    }));
    get().saveToStorage();
  },

  addUserMessage: (content) => {
    set((s) => {
      const convs = s.conversations.map((c) => {
        if (c.id !== s.activeId) return c;
        const newChatbot: [string | null, string | null][] = [...c.chatbot, [content, null]];
        const title = c.chatbot.length === 0 ? content.slice(0, 30) : c.title;
        return { ...c, chatbot: newChatbot, title, updatedAt: Date.now() };
      });
      return { conversations: convs };
    });
  },

  appendBotChunk: (chatbot, history) => {
    set((s) => {
      const convs = s.conversations.map((c) => {
        if (c.id !== s.activeId) return c;
        return { ...c, chatbot, history, updatedAt: Date.now() };
      });
      return { conversations: convs };
    });
  },

  setStreaming: (v) => set({ isStreaming: v }),
  setDraftInput: (value) => set({ draftInput: value }),
  setAbortCurrent: (handler) => set({ abortCurrent: handler }),
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  clearSelectedTool: () => set({ selectedTool: null }),
  setSelectedCoreFunction: (fnName) => set({ selectedCoreFunction: fnName }),
  clearSelectedCoreFunction: () => set({ selectedCoreFunction: null }),
  setAttachedUpload: (upload) => set({ attachedUpload: upload }),
  clearAttachedUpload: () => set({ attachedUpload: null }),

  getActiveConversation: () => {
    const s = get();
    return s.conversations.find((c) => c.id === s.activeId);
  },

  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('gpt_academic_conversations');
      if (raw) {
        const convs = JSON.parse(raw) as Conversation[];
        set({ conversations: convs, activeId: convs[0]?.id || null });
      }
    } catch { /* ignore */ }
  },

  saveToStorage: () => {
    if (typeof window === 'undefined') return;
    const { conversations } = get();
    localStorage.setItem('gpt_academic_conversations', JSON.stringify(conversations.slice(0, 50)));
  },
}));
