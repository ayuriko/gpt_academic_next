'use client';

import React, { useState, useEffect } from 'react';
import { Drawer, Input, Divider, Space, Typography, theme, Empty } from 'antd';
import { AppstoreOutlined, SearchOutlined } from '@ant-design/icons';
import { usePluginStore } from '@/stores/pluginStore';
import { fetchPlugins } from '@/lib/api';
import { PluginInfo } from '@/lib/types';
import PluginGroupFilter from './PluginGroupFilter';
import PluginButton from './PluginButton';
import PluginArgModal from './PluginArgModal';

const { Text } = Typography;

export default function PluginPanel({
  open,
  onClose,
  mainInput,
  onExecutePlugin,
}: {
  open: boolean;
  onClose: () => void;
  mainInput: string;
  onExecutePlugin: (pluginName: string, args?: Record<string, string>) => void;
}) {
  const { plugins, activeGroups, setPlugins } = usePluginStore();
  const [search, setSearch] = useState('');
  const [modalPlugin, setModalPlugin] = useState<{ name: string; info: PluginInfo } | null>(null);
  const { token } = theme.useToken();

  useEffect(() => {
    if (open && Object.keys(plugins).length === 0) {
      fetchPlugins().then(setPlugins).catch(() => {});
    }
  }, [open, plugins, setPlugins]);

  const filtered = Object.entries(plugins).filter(([name, p]) => {
    const groupMatch = p.group.split('|').some((g) => activeGroups.includes(g));
    const searchMatch = name.toLowerCase().includes(search.toLowerCase());
    return groupMatch && searchMatch && p.as_button;
  });

  const handleClick = (name: string, plugin: PluginInfo) => {
    if (plugin.advanced_args) {
      setModalPlugin({ name, info: plugin });
    } else {
      onExecutePlugin(name);
      onClose();
    }
  };

  return (
    <>
      <Drawer
        title={
          <Space>
            <AppstoreOutlined />
            <span>函数插件</span>
            <Text type="secondary" style={{ fontSize: 12 }}>({filtered.length})</Text>
          </Space>
        }
        placement="right"
        width={360}
        open={open}
        onClose={onClose}
      >
        <PluginGroupFilter />
        <Divider style={{ margin: '12px 0' }} />

        <Input
          placeholder="搜索插件..."
          prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ marginBottom: 12, borderRadius: 8 }}
        />

        {filtered.length === 0 ? (
          <Empty description="没有匹配的插件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Space wrap size={[6, 8]}>
            {filtered.map(([name, plugin]) => (
              <PluginButton
                key={name}
                name={name}
                plugin={plugin}
                onClick={() => handleClick(name, plugin)}
              />
            ))}
          </Space>
        )}
      </Drawer>

      {modalPlugin && (
        <PluginArgModal
          open={!!modalPlugin}
          pluginName={modalPlugin.name}
          plugin={modalPlugin.info}
          mainInput={mainInput}
          onOk={(args) => {
            onExecutePlugin(modalPlugin.name, args);
            setModalPlugin(null);
            onClose();
          }}
          onCancel={() => setModalPlugin(null)}
        />
      )}
    </>
  );
}
