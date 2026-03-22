'use client';

import React, { useEffect, useState } from 'react';
import { Empty, Input, Space, Typography, theme } from 'antd';
import { SearchOutlined, AppstoreOutlined } from '@ant-design/icons';
import { fetchPlugins } from '@/lib/api';
import { PluginInfo } from '@/lib/types';
import { usePluginStore } from '@/stores/pluginStore';
import PluginGroupFilter from './PluginGroupFilter';
import PluginButton from './PluginButton';
import PluginArgModal from './PluginArgModal';

const { Text } = Typography;

export default function ToolPicker({
  mainInput,
  onSelectTool,
}: {
  mainInput: string;
  onSelectTool: (tool: { name: string; args?: Record<string, string> }) => void;
}) {
  const { plugins, activeGroups, setPlugins } = usePluginStore();
  const [search, setSearch] = useState('');
  const [modalPlugin, setModalPlugin] = useState<{ name: string; info: PluginInfo } | null>(null);
  const { token } = theme.useToken();

  useEffect(() => {
    if (Object.keys(plugins).length === 0) {
      fetchPlugins().then(setPlugins).catch(() => {});
    }
  }, [plugins, setPlugins]);

  const filtered = Object.entries(plugins).filter(([name, plugin]) => {
    const groupMatch = plugin.group.split('|').some((group) => activeGroups.includes(group));
    const searchMatch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      plugin.info.toLowerCase().includes(search.toLowerCase());
    return groupMatch && searchMatch && plugin.as_button;
  });

  const handleSelect = (name: string, plugin: PluginInfo) => {
    if (plugin.advanced_args) {
      setModalPlugin({ name, info: plugin });
      return;
    }
    onSelectTool({ name });
  };

  return (
    <>
      <div
        style={{
          width: 380,
          maxWidth: 'calc(100vw - 32px)',
          padding: 6,
        }}
      >
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between', marginBottom: 10 }}>
          <Space>
            <AppstoreOutlined style={{ color: token.colorPrimary }} />
            <Text strong style={{ fontSize: 14 }}>工具</Text>
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>{filtered.length} 个可用插件</Text>
        </Space>

        <Input
          placeholder="搜索工具..."
          prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ marginBottom: 12, borderRadius: 999 }}
        />

        <PluginGroupFilter />

        <div
          style={{
            marginTop: 12,
            maxHeight: 260,
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          {filtered.length === 0 ? (
            <Empty description="没有匹配的工具" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Space wrap size={[8, 8]}>
              {filtered.map(([name, plugin]) => (
                <PluginButton
                  key={name}
                  name={name}
                  plugin={plugin}
                  onClick={() => handleSelect(name, plugin)}
                />
              ))}
            </Space>
          )}
        </div>
      </div>

      {modalPlugin && (
        <PluginArgModal
          open={!!modalPlugin}
          pluginName={modalPlugin.name}
          plugin={modalPlugin.info}
          mainInput={mainInput}
          onOk={(args) => {
            const toolArgs = Object.fromEntries(
              Object.entries(args).filter(([key, value]) => key !== 'main_input' && Boolean(value?.trim()))
            );
            onSelectTool({ name: modalPlugin.name, args: toolArgs });
            setModalPlugin(null);
          }}
          onCancel={() => setModalPlugin(null)}
        />
      )}
    </>
  );
}
