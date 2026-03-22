'use client';

import React, { useRef, useEffect } from 'react';
import { Empty, Spin, theme } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import MessageBubble from './MessageBubble';
import { useChatStore } from '@/stores/chatStore';

export default function ChatArea() {
  const { getActiveConversation, isStreaming } = useChatStore();
  const conv = getActiveConversation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const { token } = theme.useToken();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conv?.chatbot]);

  if (!conv) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty
          image={<RobotOutlined style={{ fontSize: 64, color: token.colorTextQuaternary }} />}
          description={
            <span style={{ color: token.colorTextSecondary, fontSize: 16 }}>
              开始一个新对话，探索 AI 的无限可能
            </span>
          }
        />
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        paddingBottom: 16,
      }}
    >
      {conv.chatbot.map(([user, bot], i) => (
        <React.Fragment key={i}>
          {user && <MessageBubble role="user" content={user} />}
          {bot !== undefined && <MessageBubble role="assistant" content={bot} />}
          {bot === null && isStreaming && i === conv.chatbot.length - 1 && (
            <div style={{ padding: '16px 24px', display: 'flex', gap: 12, alignItems: 'center' }}>
              <Spin size="small" />
              <span style={{ color: token.colorTextSecondary, fontSize: 13 }}>正在思考...</span>
            </div>
          )}
        </React.Fragment>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
