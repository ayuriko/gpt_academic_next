'use client';

import React, { useState } from 'react';
import { Layout, Menu, Button, Typography, Popconfirm, Input, theme } from 'antd';
import { PlusOutlined, DeleteOutlined, MessageOutlined, SearchOutlined, EditOutlined, CheckOutlined } from '@ant-design/icons';
import { useChatStore } from '@/stores/chatStore';

const { Sider } = Layout;
const { Text } = Typography;

export default function Sidebar({ collapsed, onCollapse }: { collapsed: boolean; onCollapse: (v: boolean) => void }) {
  const { conversations, activeId, createConversation, setActive, deleteConversation, renameConversation } = useChatStore();
  const { token } = theme.useToken();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const startRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const confirmRename = () => {
    if (editingId && editTitle.trim()) {
      renameConversation(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <Sider
      width={280}
      collapsedWidth={0}
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      trigger={null}
      style={{
        height: '100vh',
        borderRight: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          block
          onClick={() => createConversation()}
          style={{ marginBottom: 12, borderRadius: 8 }}
        >
          新对话
        </Button>

        <Input
          placeholder="搜索对话..."
          prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 12, borderRadius: 8 }}
          allowClear
        />

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Menu
            mode="inline"
            selectedKeys={activeId ? [activeId] : []}
            style={{ border: 'none' }}
            items={filtered.map((c) => ({
              key: c.id,
              icon: <MessageOutlined />,
              label: editingId === c.id ? (
                <Input
                  size="small"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onPressEnter={confirmRename}
                  onBlur={confirmRename}
                  autoFocus
                  suffix={<CheckOutlined onClick={confirmRename} style={{ cursor: 'pointer', color: token.colorPrimary }} />}
                  style={{ fontSize: 13 }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text ellipsis style={{ flex: 1, fontSize: 13 }}>{c.title}</Text>
                  <span style={{ display: 'flex', gap: 2, opacity: 0.4 }}>
                    <EditOutlined
                      onClick={(e) => { e.stopPropagation(); startRename(c.id, c.title); }}
                      style={{ fontSize: 12 }}
                    />
                    <Popconfirm
                      title="删除此对话？"
                      onConfirm={(e) => { e?.stopPropagation(); deleteConversation(c.id); }}
                      okText="删除"
                      cancelText="取消"
                    >
                      <DeleteOutlined
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 12 }}
                      />
                    </Popconfirm>
                  </span>
                </div>
              ),
              onClick: () => { if (editingId !== c.id) setActive(c.id); },
            }))}
          />
        </div>

        <div style={{ paddingTop: 12, borderTop: `1px solid ${token.colorBorderSecondary}`, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>GPT Academic Next</Text>
        </div>
      </div>
    </Sider>
  );
}
