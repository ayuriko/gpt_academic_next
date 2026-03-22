'use client';

import React, { useEffect, useState } from 'react';
import { Layout, ConfigProvider } from 'antd';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useSettingsStore } from '@/stores/settingsStore';
import { useChatStore } from '@/stores/chatStore';
import { lightTheme, darkTheme } from '@/lib/theme';
import { fetchConfig } from '@/lib/api';

const { Content } = Layout;

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const { darkMode, setAvailModels, setCoreFunctions, loadFromStorage: loadSettings } = useSettingsStore();
  const { loadFromStorage: loadChats } = useChatStore();

  useEffect(() => {
    loadSettings();
    loadChats();
    setHydrated(true);
    fetchConfig()
      .then((cfg) => {
        setAvailModels(cfg.avail_llm_models);
        setCoreFunctions(cfg.core_functions || {});
      })
      .catch(() => {
        setAvailModels([
          'gpt-5.4', 'gpt-5.3-codex', 'gpt-5.2', 'gpt-5.1', 'gpt-5',
          'gpt-4o', 'gpt-4o-mini', 'deepseek-reasoner', 'deepseek-chat',
          'qwen-max', 'o3', 'o4-mini',
        ]);
        setCoreFunctions({});
      });
  }, [loadChats, loadSettings, setAvailModels, setCoreFunctions]);

  // 数据从 localStorage 加载完成前不渲染，避免闪屏
  if (!hydrated) {
    return null;
  }

  return (
    <ConfigProvider theme={darkMode ? darkTheme : lightTheme}>
      <Layout style={{ height: '100vh', overflow: 'hidden' }}>
        <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
        <Layout>
          <Header
            sidebarCollapsed={collapsed}
            onToggleSidebar={() => setCollapsed(!collapsed)}
          />
          <Content style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {children}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
