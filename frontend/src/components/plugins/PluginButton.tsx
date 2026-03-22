'use client';

import React from 'react';
import { Button } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { PluginInfo } from '@/lib/types';

const colorMap: Record<string, string> = {
  primary: 'primary',
  secondary: 'default',
  stop: 'default',
};

export default function PluginButton({
  name,
  plugin,
  onClick,
}: {
  name: string;
  plugin: PluginInfo;
  onClick: () => void;
}) {
  return (
    <Button
      size="small"
      type={plugin.color === 'primary' ? 'primary' : 'default'}
      icon={<ThunderboltOutlined />}
      onClick={onClick}
      style={{ borderRadius: 6, fontSize: 12 }}
    >
      {name}
    </Button>
  );
}
