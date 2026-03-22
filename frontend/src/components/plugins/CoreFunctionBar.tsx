'use client';

import React from 'react';
import { Button, Space } from 'antd';
import { CoreFunction } from '@/lib/types';

export default function CoreFunctionBar({
  functions,
  onExecute,
}: {
  functions: Record<string, CoreFunction>;
  onExecute: (fnName: string) => void;
}) {
  return (
    <Space wrap size={[6, 6]}>
      {Object.entries(functions).map(([name, fn]) => (
        <Button
          key={name}
          size="small"
          type={fn.Color === 'primary' ? 'primary' : 'default'}
          onClick={() => onExecute(name)}
          style={{
            borderRadius: 999,
            height: 28,
            paddingInline: 12,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {name}
        </Button>
      ))}
    </Space>
  );
}
