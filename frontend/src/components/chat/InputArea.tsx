'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Input, Button, Tooltip, Popover, Dropdown, theme, message } from 'antd';
import { PlusOutlined, StopOutlined, AudioOutlined, ControlOutlined, CloseOutlined, ThunderboltOutlined, FilePdfOutlined, FileTextOutlined, FileImageOutlined, FileOutlined, PaperClipOutlined } from '@ant-design/icons';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { streamChat, parseSSEStream, uploadFiles } from '@/lib/api';
import ToolPicker from '@/components/plugins/ToolPicker';

const { TextArea } = Input;

export default function InputArea() {
  const { token } = theme.useToken();
  const [toolPickerOpen, setToolPickerOpen] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const {
    activeId, isStreaming, draftInput, abortCurrent, selectedTool, attachedUpload, appendBotChunk,
    setStreaming, createConversation, saveToStorage, setDraftInput, setAbortCurrent, setSelectedTool, clearSelectedTool, setAttachedUpload, clearAttachedUpload,
  } = useChatStore();
  const { llmModel, topP, temperature, maxLength, systemPrompt } = useSettingsStore();
  const conv = useChatStore((state) => state.getActiveConversation());
  const sendLockRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const isEmptyConversation = !conv || conv.chatbot.length === 0;

  const attachedFileName = attachedUpload?.paths?.[0]?.split('/').pop() || '';
  const attachedFileCount = attachedUpload?.paths?.length || 0;
  const attachedFileExt = attachedFileName.includes('.') ? attachedFileName.split('.').pop()?.toUpperCase() || '文件' : '文件';

  const attachmentTitle = attachedUpload
    ? attachedFileCount > 1
      ? `${attachedFileName} 等 ${attachedFileCount} 个文件`
      : attachedFileName
    : '';

  const attachmentIcon = (() => {
    const ext = attachedFileExt.toLowerCase();
    if (ext === 'pdf') return <FilePdfOutlined style={{ color: '#fff', fontSize: 24 }} />;
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return <FileImageOutlined style={{ color: '#fff', fontSize: 24 }} />;
    if (['md', 'txt', 'doc', 'docx'].includes(ext)) return <FileTextOutlined style={{ color: '#fff', fontSize: 24 }} />;
    return <FileOutlined style={{ color: '#fff', fontSize: 24 }} />;
  })();

  const handleSend = async () => {
    const msg = draftInput.trim();
    if ((!msg && !selectedTool && !attachedUpload) || isStreaming || sendLockRef.current) return;
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
          c.id === convId ? { ...c, title: (msg || selectedTool?.name || '新对话').slice(0, 30) } : c
        ),
      }));
    }
    setDraftInput('');
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
        plugin_name: selectedTool?.name,
        plugin_kwargs: selectedTool?.args,
        session_id: convId,
        attached_upload_path: attachedUpload?.input_path || null,
      });
      setAbortCurrent(abort);

      const res = await response;
      if (!res.ok) {
        appendBotChunk(
          [...prevChatbot, [msg || selectedTool?.name || null, `错误: ${res.status} ${res.statusText}`]],
          history
        );
        setStreaming(false);
        return;
      }

      // 用 requestAnimationFrame 节流 SSE 更新，避免每个 chunk 都触发重渲染
      let pendingEvent: { chatbot: [string | null, string | null][]; history: string[] } | null = null;
      let rafId: number | null = null;

      const flushUpdate = () => {
        if (pendingEvent) {
          appendBotChunk(pendingEvent.chatbot, pendingEvent.history);
          pendingEvent = null;
        }
        rafId = null;
      };

      for await (const event of parseSSEStream(res)) {
        pendingEvent = event;
        if (rafId === null) {
          rafId = requestAnimationFrame(flushUpdate);
        }
      }

      // 确保最后一次更新不丢失
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (pendingEvent) appendBotChunk(pendingEvent.chatbot, pendingEvent.history);
    } catch (err: unknown) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        const currentConv = useChatStore.getState().getActiveConversation();
        const errorMessage = err instanceof Error ? err.message : '未知错误';
        appendBotChunk(
          [...(currentConv?.chatbot || []).slice(0, -1), [msg || selectedTool?.name || null, `错误: ${errorMessage}`]],
          history
        );
      }
    } finally {
      setStreaming(false);
      setAbortCurrent(null);
      sendLockRef.current = false;
      saveToStorage();
    }
  };

  const handleStop = () => {
    abortCurrent?.();
    setStreaming(false);
  };

  const handleAttachmentFiles = async (files: File[]) => {
    if (files.length === 0) return;

    try {
      const sessionId = activeId || createConversation();
      const result = await uploadFiles(files, sessionId);
      setAttachedUpload(result);
      message.success(`已添加 ${files.length} 个文件`);
    } catch {
      message.error('上传失败');
    }
  };

  useEffect(() => {
    const shouldHandleFileDrag = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types || []).includes('Files');

    const preventBrowserOpenFile = (event: DragEvent) => {
      if (!shouldHandleFileDrag(event)) return;
      event.preventDefault();
    };

    window.addEventListener('dragover', preventBrowserOpenFile);
    window.addEventListener('drop', preventBrowserOpenFile);

    return () => {
      window.removeEventListener('dragover', preventBrowserOpenFile);
      window.removeEventListener('drop', preventBrowserOpenFile);
    };
  }, []);

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    await handleAttachmentFiles(files);
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragActive(false);
    const files = Array.from(event.dataTransfer.files || []);
    await handleAttachmentFiles(files);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ padding: isEmptyConversation ? '0 24px 34px' : '12px 24px 20px', background: token.colorBgLayout }}>
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          position: 'relative',
          maxWidth: isEmptyConversation ? 1220 : 860,
          margin: '0 auto',
          border: `1px solid ${isDragActive ? token.colorPrimary : token.colorBorder}`,
          borderRadius: isEmptyConversation ? 36 : 30,
          background: token.colorBgContainer,
          overflow: 'hidden',
          boxShadow: isEmptyConversation ? '0 20px 52px rgba(15, 23, 42, 0.08)' : '0 12px 32px rgba(30, 41, 59, 0.08)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
          transform: isDragActive ? 'translateY(-2px)' : 'translateY(0)',
        }}
      >
        {isDragActive && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.78)',
              backdropFilter: 'blur(6px)',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                padding: '18px 26px',
                borderRadius: 22,
                border: `1px dashed ${token.colorPrimary}`,
                background: token.colorBgContainer,
                boxShadow: '0 18px 45px rgba(47, 107, 255, 0.12)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 600, color: token.colorText }}>
                松开以上传到输入框
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: token.colorTextSecondary }}>
                文件会作为当前对话附件添加，不会在浏览器里打开
              </div>
            </div>
          </div>
        )}

        {attachedUpload && (
          <div
            style={{
              padding: '10px 14px 0',
              background: token.colorBgContainer,
            }}
          >
            <div
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                maxWidth: 520,
                padding: '8px 12px',
                borderRadius: 20,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgElevated,
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'linear-gradient(180deg, #ff5b57 0%, #ff3b30 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ transform: 'scale(0.62)' }}>{attachmentIcon}</span>
              </div>
              <div style={{ minWidth: 0, paddingRight: 16 }}>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.25,
                    fontWeight: 600,
                    color: token.colorText,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {attachmentTitle}
                </div>
                <div style={{ marginTop: 1, fontSize: 11, color: token.colorTextSecondary }}>
                  {attachedFileCount > 1 ? `${attachedFileCount} 个文件` : attachedFileExt}
                </div>
              </div>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={clearAttachedUpload}
                style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  width: 20,
                  height: 20,
                  minWidth: 20,
                  borderRadius: 999,
                  color: token.colorTextSecondary,
                }}
              />
            </div>
          </div>
        )}

        <TextArea
          value={draftInput}
          onChange={(e) => setDraftInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="有问题，尽管问"
          autoSize={{ minRows: isEmptyConversation ? 3 : 1, maxRows: 6 }}
          variant="borderless"
          style={{
            padding: isEmptyConversation ? '24px 28px 10px' : '18px 22px 8px',
            fontSize: isEmptyConversation ? 20 : 18,
            resize: 'none',
          }}
        />

        {selectedTool && (
          <div style={{ padding: '0 18px 8px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 14px',
                borderRadius: 999,
                border: `1px solid ${token.colorPrimaryBorder}`,
                background: token.colorPrimaryBg,
                color: token.colorPrimary,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <ThunderboltOutlined />
              <span>{selectedTool.name}</span>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={clearSelectedTool}
                style={{ width: 20, height: 20, minWidth: 20, color: token.colorPrimary }}
              />
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '6px 14px 12px',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Dropdown
              open={attachmentMenuOpen}
              onOpenChange={setAttachmentMenuOpen}
              trigger={['click']}
              placement="topLeft"
              menu={{
                items: [
                  {
                    key: 'upload-file',
                    icon: <PaperClipOutlined style={{ fontSize: 18 }} />,
                    label: <span style={{ fontSize: 15, fontWeight: 500 }}>添加照片和文件</span>,
                  },
                ],
                onClick: ({ key }) => {
                  if (key === 'upload-file') {
                    fileInputRef.current?.click();
                  }
                },
                style: {
                  borderRadius: 18,
                  padding: 6,
                  minWidth: 220,
                },
              }}
              dropdownRender={(menu) => (
                <div
                  style={{
                    background: token.colorBgContainer,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: 18,
                    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12)',
                    overflow: 'hidden',
                  }}
                >
                  {menu}
                </div>
              )}
            >
              <Button
                type="text"
                icon={<PlusOutlined />}
                size="small"
                style={{
                  borderRadius: 999,
                  width: 34,
                  height: 34,
                  minWidth: 34,
                  padding: 0,
                  background: 'transparent',
                  color: token.colorTextSecondary,
                  fontSize: 18,
                }}
              />
            </Dropdown>

            <Popover
              open={toolPickerOpen}
              onOpenChange={setToolPickerOpen}
              content={
                <ToolPicker
                  mainInput={draftInput}
                  onSelectTool={(tool) => {
                    setSelectedTool(tool);
                    setToolPickerOpen(false);
                  }}
                />
              }
              trigger="click"
              placement="topLeft"
            >
              <Button
                type="default"
                size="middle"
                icon={<ControlOutlined />}
                style={{
                  borderRadius: 999,
                  height: 40,
                  paddingInline: 16,
                  borderColor: toolPickerOpen || selectedTool ? token.colorPrimaryBorder : token.colorBorderSecondary,
                  background: toolPickerOpen || selectedTool ? token.colorPrimaryBg : token.colorFillTertiary,
                  color: toolPickerOpen || selectedTool ? token.colorPrimary : token.colorText,
                  fontWeight: 500,
                }}
              >
                工具
              </Button>
            </Popover>

          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tooltip title="语音输入">
              <Button
                type="text"
                icon={<AudioOutlined />}
                size="small"
                style={{ borderRadius: 999, width: 40, height: 40 }}
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
                disabled={!draftInput.trim() && !selectedTool && !attachedUpload}
                style={{
                  width: 42,
                  height: 42,
                  background: draftInput.trim() || selectedTool || attachedUpload ? '#b7b9bf' : undefined,
                  borderColor: draftInput.trim() || selectedTool || attachedUpload ? '#b7b9bf' : undefined,
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
