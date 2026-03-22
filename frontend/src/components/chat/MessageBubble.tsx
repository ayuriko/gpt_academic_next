'use client';

import React, { useState } from 'react';
import { Typography, theme, Avatar, Button, Tooltip, message } from 'antd';
import { UserOutlined, RobotOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import TTSPlayer from '@/components/audio/TTSPlayer';

const { Paragraph } = Typography;

interface MultiModelSection {
  model: string;
  content: string;
}

function normalizeToMarkdown(content: string) {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/<pre><code[^>]*>/gi, '```\n')
    .replace(/<\/code><\/pre>/gi, '\n```')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n\n---\n\n')
    .replace(/<\/?font[^>]*>/gi, '')
    .replace(/<\/?span[^>]*>/gi, '')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img\s+[^>]*src="([^"]+)"[^>]*>/gi, '![]($1)')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<\/?(strong|b)>/gi, '**')
    .replace(/<\/?(em|i)>/gi, '*')
    .replace(/<\/?[^>\n]+>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseMultiModelSections(content: string): MultiModelSection[] {
  const parts = content.split(/\n\n---\n\n(?=###\s+`?[^`\n]+`?\s*\n\n)/);
  const sections = parts
    .map((part) => {
      const match = part.match(/^###\s+`?([^`\n]+)`?\s*\n\n([\s\S]*)$/);
      if (!match) return null;
      return {
        model: match[1].trim(),
        content: match[2].trim(),
      };
    })
    .filter((section): section is MultiModelSection => Boolean(section));

  return sections.length >= 2 ? sections : [];
}

export default React.memo(function MessageBubble({
  role,
  content,
  isStreamingMsg = false,
}: {
  role: 'user' | 'assistant';
  content: string | null;
  isStreamingMsg?: boolean;
}) {
  const { token } = theme.useToken();
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  if (!content) return null;

  const normalizedContent = normalizeToMarkdown(content);
  const multiModelSections = isUser ? [] : parseMultiModelSections(normalizedContent);
  const isMultiModelCompare = multiModelSections.length >= 2;

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
      <div style={{ maxWidth: isMultiModelCompare ? '100%' : '70%', width: isMultiModelCompare ? '100%' : 'auto' }}>
        <div
          style={{
            padding: isMultiModelCompare ? 10 : '12px 16px',
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            background: isUser ? token.colorPrimaryBg : token.colorBgContainer,
            border: `1px solid ${isUser ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
            wordBreak: 'break-word',
            lineHeight: 1.6,
          }}
        >
          {isUser ? (
            <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {content}
            </Paragraph>
          ) : (
            isStreamingMsg ? (
              // 流式输出时用纯文本渲染，避免每次 chunk 重新解析 markdown
              <div style={{ fontSize: 15, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {content}
              </div>
            ) :
            isMultiModelCompare ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 12,
                }}
              >
                {multiModelSections.map((section) => (
                  <div
                    key={section.model}
                    style={{
                      minWidth: 0,
                      padding: '14px 16px',
                      borderRadius: 18,
                      border: `1px solid ${token.colorBorderSecondary}`,
                      background: token.colorBgElevated,
                      boxShadow: '0 8px 20px rgba(15, 23, 42, 0.05)',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: token.colorFillSecondary,
                        color: token.colorText,
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 12,
                      }}
                    >
                      {section.model}
                    </div>
                    {section.content ? (
                      <div style={{ fontSize: 15 }}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            p: ({ children }) => <p style={{ margin: '0 0 12px' }}>{children}</p>,
                            h1: ({ children }) => <h1 style={{ margin: '0 0 12px', fontSize: 24 }}>{children}</h1>,
                            h2: ({ children }) => <h2 style={{ margin: '0 0 12px', fontSize: 20 }}>{children}</h2>,
                            h3: ({ children }) => <h3 style={{ margin: '0 0 10px', fontSize: 17 }}>{children}</h3>,
                            ul: ({ children }) => <ul style={{ margin: '0 0 12px 18px', padding: 0 }}>{children}</ul>,
                            ol: ({ children }) => <ol style={{ margin: '0 0 12px 18px', padding: 0 }}>{children}</ol>,
                            li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                            pre: ({ children }) => (
                              <pre
                                style={{
                                  margin: '0 0 12px',
                                  padding: '12px 14px',
                                  borderRadius: 12,
                                  background: token.colorFillTertiary,
                                  overflowX: 'auto',
                                  whiteSpace: 'pre-wrap',
                                }}
                              >
                                {children}
                              </pre>
                            ),
                            code: ({ className, children }) => {
                              const isInline = !className;
                              return isInline ? (
                                <code
                                  style={{
                                    padding: '2px 6px',
                                    borderRadius: 6,
                                    background: token.colorFillTertiary,
                                    fontSize: '0.92em',
                                  }}
                                >
                                  {children}
                                </code>
                              ) : (
                                <code className={className}>{children}</code>
                              );
                            },
                            blockquote: ({ children }) => (
                              <blockquote
                                style={{
                                  margin: '0 0 12px',
                                  paddingLeft: 12,
                                  borderLeft: `3px solid ${token.colorBorder}`,
                                  color: token.colorTextSecondary,
                                }}
                              >
                                {children}
                              </blockquote>
                            ),
                            hr: () => <hr style={{ border: 0, borderTop: `1px solid ${token.colorBorderSecondary}`, margin: '16px 0' }} />,
                            img: ({ src = '', alt = '' }) => <img src={src} alt={alt} style={{ maxWidth: '100%', borderRadius: 12 }} />,
                          }}
                        >
                          {section.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '10px 0 4px',
                          color: token.colorTextSecondary,
                          fontSize: 14,
                        }}
                      >
                        正在响应中...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  fontSize: 15,
                }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    p: ({ children }) => <p style={{ margin: '0 0 12px' }}>{children}</p>,
                    h1: ({ children }) => <h1 style={{ margin: '0 0 12px', fontSize: 24 }}>{children}</h1>,
                    h2: ({ children }) => <h2 style={{ margin: '0 0 12px', fontSize: 20 }}>{children}</h2>,
                    h3: ({ children }) => <h3 style={{ margin: '0 0 10px', fontSize: 17 }}>{children}</h3>,
                    ul: ({ children }) => <ul style={{ margin: '0 0 12px 18px', padding: 0 }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ margin: '0 0 12px 18px', padding: 0 }}>{children}</ol>,
                    li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                    pre: ({ children }) => (
                      <pre
                        style={{
                          margin: '0 0 12px',
                          padding: '12px 14px',
                          borderRadius: 12,
                          background: token.colorFillTertiary,
                          overflowX: 'auto',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {children}
                      </pre>
                    ),
                    code: ({ className, children }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code
                          style={{
                            padding: '2px 6px',
                            borderRadius: 6,
                            background: token.colorFillTertiary,
                            fontSize: '0.92em',
                          }}
                        >
                          {children}
                        </code>
                      ) : (
                        <code className={className}>{children}</code>
                      );
                    },
                    blockquote: ({ children }) => (
                      <blockquote
                        style={{
                          margin: '0 0 12px',
                          paddingLeft: 12,
                          borderLeft: `3px solid ${token.colorBorder}`,
                          color: token.colorTextSecondary,
                        }}
                      >
                        {children}
                      </blockquote>
                    ),
                    hr: () => <hr style={{ border: 0, borderTop: `1px solid ${token.colorBorderSecondary}`, margin: '16px 0' }} />,
                    img: ({ src = '', alt = '' }) => <img src={src} alt={alt} style={{ maxWidth: '100%', borderRadius: 12 }} />,
                  }}
                >
                  {normalizedContent}
                </ReactMarkdown>
              </div>
            )
          )}
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
});
