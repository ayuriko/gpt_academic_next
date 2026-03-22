'use client';

import React, { useEffect, useState } from 'react';
import { Layout, ConfigProvider } from 'antd';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import PluginPanel from '@/components/plugins/PluginPanel';
import { useSettingsStore } from '@/stores/settingsStore';
import { useChatStore } from '@/stores/chatStore';
import { lightTheme, darkTheme } from '@/lib/theme';
import { fetchConfig } from '@/lib/api';

const { Content } = Layout;

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [pluginsOpen, setPluginsOpen] = useState(false);
  const { darkMode, setAvailModels, loadFromStorage: loadSettings } = useSettingsStore();
  const { loadFromStorage: loadChats } = useChatStore();

  useEffect(() => {
    loadSettings();
    loadChats();
    fetchConfig()
      .then((cfg) => setAvailModels(cfg.avail_llm_models))
      .catch(() => {
        setAvailModels([
          'gpt-5.4', 'gpt-5.3-codex', 'gpt-5.2', 'gpt-5.1', 'gpt-5',
          'gpt-4o', 'gpt-4o-mini', 'deepseek-reasoner', 'deepseek-chat',
          'qwen-max', 'o3', 'o4-mini',
        ]);
      });
  }, []);

  const handleExecutePlugin = (pluginName: string, args?: { main_input: string; advanced_arg: string }) => {
    // TODO: wire up to SSE chat with plugin_name
    console.log('Execute plugin:', pluginName, args);
  };

  return (
    <ConfigProvider theme={darkMode ? darkTheme : lightTheme}>
      <Layout style={{ height: '100vh', overflow: 'hidden' }}>
        <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
        <Layout>
          <Header
            sidebarCollapsed={collapsed}
            onToggleSidebar={() => setCollapsed(!collapsed)}
            onOpenPlugins={() => setPluginsOpen(true)}
          />
          <Content style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {children}
          </Content>
        </Layout>
      </Layout>

      <PluginPanel
        open={pluginsOpen}
        onClose={() => setPluginsOpen(false)}
        mainInput=""
        onExecutePlugin={handleExecutePlugin}
      />
    </ConfigProvider>
  );
}
