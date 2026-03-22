'use client';

import React, { useState } from 'react';
import { Select, Button, Space, Tooltip, theme } from 'antd';
import { SunOutlined, MoonOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SettingOutlined } from '@ant-design/icons';
import { useSettingsStore } from '@/stores/settingsStore';
import SettingsDrawer from '@/components/settings/SettingsDrawer';

export default function Header({
  sidebarCollapsed,
  onToggleSidebar,
}: {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}) {
  const { llmModel, setModel, availModels, darkMode, toggleDarkMode } = useSettingsStore();
  const { token } = theme.useToken();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <div
        style={{
          height: 56,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
        }}
      >
        <Space>
          <Button
            type="text"
            icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={onToggleSidebar}
          />
          <Select
            value={llmModel}
            onChange={setModel}
            style={{ width: 220 }}
            showSearch
            placeholder="选择模型"
            options={availModels.map((m) => ({ label: m, value: m }))}
            optionFilterProp="label"
          />
        </Space>

        <Space>
          <Tooltip title={darkMode ? '切换亮色模式' : '切换暗色模式'}>
            <Button
              type="text"
              icon={darkMode ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleDarkMode}
            />
          </Tooltip>
          <Tooltip title="设置">
            <Button type="text" icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)} />
          </Tooltip>
        </Space>
      </div>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
