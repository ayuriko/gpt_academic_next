'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { Spin, theme } from 'antd';
import MessageBubble from './MessageBubble';
import { useChatStore } from '@/stores/chatStore';

export default function ChatArea() {
  const { getActiveConversation, isStreaming } = useChatStore();
  const conv = getActiveConversation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const { token } = theme.useToken();

  // 节流滚动：流式输出时用 RAF 限频 + instant，结束后 smooth
  const scrollToBottom = useCallback((smooth: boolean) => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
      scrollRafRef.current = null;
    });
  }, []);

  useEffect(() => {
    scrollToBottom(!isStreaming);
  }, [conv?.chatbot, isStreaming, scrollToBottom]);

  if (!conv || conv.chatbot.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: `radial-gradient(circle at top, ${token.colorFillTertiary} 0%, transparent 56%)`,
        }}
      >
        <div style={{ textAlign: 'center', marginTop: '-12vh' }}>
          <div
            style={{
              fontSize: 34,
              fontWeight: 500,
              letterSpacing: '-0.04em',
              color: token.colorTextTertiary,
              marginBottom: 12,
            }}
          >
            你今天在想些什么？
          </div>
        </div>
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
      {conv.chatbot.map(([user, bot], i) => {
        const isLastMsg = i === conv.chatbot.length - 1;
        return (
          <React.Fragment key={i}>
            {user && <MessageBubble role="user" content={user} />}
            {bot !== undefined && (
              <MessageBubble
                role="assistant"
                content={bot}
                isStreamingMsg={isStreaming && isLastMsg}
              />
            )}
            {bot === null && isStreaming && isLastMsg && (
              <div style={{ padding: '16px 24px', display: 'flex', gap: 12, alignItems: 'center' }}>
                <Spin size="small" />
                <span style={{ color: token.colorTextSecondary, fontSize: 13 }}>正在思考...</span>
              </div>
            )}
          </React.Fragment>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
