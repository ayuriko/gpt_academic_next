'use client';

import React from 'react';
import { Tag } from 'antd';
import { usePluginStore } from '@/stores/pluginStore';

const ALL_GROUPS = ['对话', '编程', '学术', '智能体'];

export default function PluginGroupFilter() {
  const { activeGroups, setActiveGroups } = usePluginStore();

  const toggle = (group: string) => {
    if (activeGroups.includes(group)) {
      setActiveGroups(activeGroups.filter((g) => g !== group));
    } else {
      setActiveGroups([...activeGroups, group]);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {ALL_GROUPS.map((g) => (
        <Tag.CheckableTag
          key={g}
          checked={activeGroups.includes(g)}
          onChange={() => toggle(g)}
          style={{ borderRadius: 6, padding: '2px 10px', fontSize: 13 }}
        >
          {g}
        </Tag.CheckableTag>
      ))}
    </div>
  );
}
