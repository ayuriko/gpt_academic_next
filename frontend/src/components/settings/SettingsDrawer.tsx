'use client';

import React from 'react';
import { Drawer, Slider, InputNumber, Input, Space, Typography, Divider, theme } from 'antd';
import { useSettingsStore } from '@/stores/settingsStore';

const { TextArea } = Input;
const { Text } = Typography;

export default function SettingsDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    topP, temperature, maxLength, systemPrompt,
    setTopP, setTemperature, setMaxLength, setSystemPrompt,
  } = useSettingsStore();
  const { token } = theme.useToken();

  return (
    <Drawer title="对话设置" placement="right" size="default" open={open} onClose={onClose}>
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Text strong style={{ fontSize: 13 }}>Temperature</Text>
          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
            值越高回答越有创造性，越低越确定
          </Text>
          <Slider min={0} max={2} step={0.1} value={temperature} onChange={setTemperature} />
          <InputNumber
            min={0} max={2} step={0.1} value={temperature}
            onChange={(v) => v !== null && setTemperature(v)}
            size="small" style={{ width: 80 }}
          />
        </div>

        <div>
          <Text strong style={{ fontSize: 13 }}>Top P</Text>
          <Slider min={0} max={1} step={0.05} value={topP} onChange={setTopP} />
          <InputNumber
            min={0} max={1} step={0.05} value={topP}
            onChange={(v) => v !== null && setTopP(v)}
            size="small" style={{ width: 80 }}
          />
        </div>

        <div>
          <Text strong style={{ fontSize: 13 }}>Max Length</Text>
          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
            留空使用模型默认值
          </Text>
          <InputNumber
            min={256} max={1048576} step={256}
            value={maxLength} onChange={(v) => setMaxLength(v)}
            placeholder="默认"
            style={{ width: '100%' }}
          />
        </div>

        <Divider style={{ margin: '8px 0' }} />

        <div>
          <Text strong style={{ fontSize: 13 }}>System Prompt</Text>
          <TextArea
            rows={4}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="系统提示词..."
            style={{ marginTop: 8, borderRadius: 8 }}
          />
        </div>
      </Space>
    </Drawer>
  );
}
