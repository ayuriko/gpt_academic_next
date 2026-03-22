'use client';

import React, { useState, useRef } from 'react';
import { Input, Button, Tooltip, Popover, Dropdown, theme } from 'antd';
import { PlusOutlined, StopOutlined, AudioOutlined } from '@ant-design/icons';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { streamChat, parseSSEStream } from '@/lib/api';
import FileUpload from '@/components/upload/FileUpload';

const { TextArea } = Input;

export default function InputArea() {
  const [input, setInput] = useState('');
  const { token } = theme.useToken();
  const {
    activeId, isStreaming, appendBotChunk,
    setStreaming, createConversation, saveToStorage,
  } = useChatStore();
  const { llmModel, topP, temperature, maxLength, systemPrompt } = useSettingsStore();
  const abortRef = useRef<(() => void) | null>(null);
  const sendLockRef = useRef(false);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || isStreaming || sendLockRef.current) return;
    sendLockRef.current = true;

    let convId = activeId;
    if (!convId) {
      convId = createConversation();
    }

    const conv = useChatStore.getState().getActiveConversation();
    const history = conv?.history || [];
    const prevChatbot = conv?.chatbot || [];

    if (prevChatbot.length === 0) {
      useChatStore.setState((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === convId ? { ...c, title: msg.slice(0, 30) } : c
        ),
      }));
    }
    setInput('');
    setStreaming(true);

    try {
      const { response, abort } = streamChat({
        message: msg,
        history,
        system_prompt: systemPrompt,
        llm_model: llmModel,
        top_p: topP,
        temperature,
        max_length: maxLength,
      });
      abortRef.current = abort;

      const res = await response;
      if (!res.ok) {
        appendBotChunk(
          [...prevChatbot, [msg, `错误: ${res.status} ${res.statusText}`]],
          history
        );
        setStreaming(false);
        return;
      }

      for await (const event of parseSSEStream(res)) {
        appendBotChunk(event.chatbot, event.history);
      }
    } catch (err: unknown) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        const currentConv = useChatStore.getState().getActiveConversation();
        const errorMessage = err instanceof Error ? err.message : '未知错误';
        appendBotChunk(
          [...(currentConv?.chatbot || []).slice(0, -1), [msg, `错误: ${errorMessage}`]],
          history
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      sendLockRef.current = false;
      saveToStorage();
    }
  };

  const handleStop = () => {
    abortRef.current?.();
    setStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ padding: '12px 24px 20px', background: token.colorBgLayout }}>
      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: 20,
          background: token.colorBgContainer,
          overflow: 'hidden',
        }}
      >
        {/* Top: text input area */}
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="有问题，尽管问"
          autoSize={{ minRows: 1, maxRows: 6 }}
          variant="borderless"
          style={{
            padding: '14px 18px 4px',
            fontSize: 15,
            resize: 'none',
          }}
        />

        {/* Bottom: toolbar row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 10px 10px',
          }}
        >
          {/* Left side: attach + model indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Popover
              content={<FileUpload onUploaded={(paths) => setInput((prev) => prev + '\n' + paths.join('\n'))} />}
              title="上传文件"
              trigger="click"
              placement="topLeft"
            >
              <Button
                type="text"
                icon={<PlusOutlined />}
                size="small"
                style={{ borderRadius: 8, width: 32, height: 32 }}
              />
            </Popover>

            <Dropdown
              menu={{
                items: [
                  { key: 'normal', label: '常规对话' },
                  { key: 'search', label: '联网搜索' },
                  { key: 'multi', label: '多模型对话' },
                ],
              }}
              trigger={['click']}
            >
              <Button
                type="text"
                size="small"
                style={{ borderRadius: 12, fontSize: 13, color: token.colorPrimary, fontWeight: 500 }}
              >
                {llmModel} ↓
              </Button>
            </Dropdown>
          </div>

          {/* Right side: voice + send/stop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tooltip title="语音输入">
              <Button
                type="text"
                icon={<AudioOutlined />}
                size="small"
                style={{ borderRadius: 8, width: 32, height: 32 }}
              />
            </Tooltip>

            {isStreaming ? (
              <Button
                type="primary"
                danger
                shape="circle"
                size="small"
                icon={<StopOutlined />}
                onClick={handleStop}
                style={{ width: 36, height: 36 }}
              />
            ) : (
              <Button
                type="primary"
                shape="circle"
                size="small"
                onClick={handleSend}
                disabled={!input.trim()}
                style={{
                  width: 36,
                  height: 36,
                  background: input.trim() ? '#000' : undefined,
                  borderColor: input.trim() ? '#000' : undefined,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
