'use client';

import React, { useState } from 'react';
import { Typography, theme, Avatar, Button, Tooltip, message } from 'antd';
import { UserOutlined, RobotOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';
import TTSPlayer from '@/components/audio/TTSPlayer';

const { Paragraph } = Typography;

export default function MessageBubble({
  role,
  content,
}: {
  role: 'user' | 'assistant';
  content: string | null;
}) {
  const { token } = theme.useToken();
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  if (!content) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      message.success('已复制');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '16px 24px',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
      }}
    >
      <Avatar
        size={36}
        icon={isUser ? <UserOutlined /> : <RobotOutlined />}
        style={{
          backgroundColor: isUser ? token.colorPrimary : token.colorSuccess,
          flexShrink: 0,
        }}
      />
      <div style={{ maxWidth: '70%' }}>
        <div
          style={{
            padding: '12px 16px',
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            background: isUser ? token.colorPrimaryBg : token.colorBgContainer,
            border: `1px solid ${isUser ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
            wordBreak: 'break-word',
            lineHeight: 1.6,
          }}
        >
          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {content}
          </Paragraph>
        </div>

        {!isUser && (
          <div style={{ marginTop: 4, display: 'flex', gap: 2 }}>
            <Tooltip title="复制">
              <Button
                type="text"
                size="small"
                icon={copied ? <CheckOutlined style={{ color: token.colorSuccess }} /> : <CopyOutlined />}
                onClick={handleCopy}
                style={{ opacity: 0.5 }}
              />
            </Tooltip>
            <TTSPlayer text={content} />
          </div>
        )}
      </div>
    </div>
  );
}
