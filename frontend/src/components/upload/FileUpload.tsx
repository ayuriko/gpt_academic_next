'use client';

import React, { useState, useCallback } from 'react';
import { Upload, message, theme } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { uploadFiles } from '@/lib/api';
import { useChatStore } from '@/stores/chatStore';
import type { UploadResult } from '@/lib/types';

const { Dragger } = Upload;

export default function FileUpload({
  onUploaded,
}: {
  onUploaded?: (result: UploadResult) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const { token } = theme.useToken();
  const { activeId, createConversation } = useChatStore();

  const handleUpload = useCallback(async (fileList: File[]) => {
    if (fileList.length === 0) return;
    setUploading(true);
    try {
      const sessionId = activeId || createConversation();
      const result = await uploadFiles(fileList, sessionId);
      onUploaded?.(result);
      message.success(`已上传 ${fileList.length} 个文件`);
    } catch {
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
  }, [activeId, createConversation, onUploaded]);

  return (
    <div>
      <Dragger
        multiple
        disabled={uploading}
        showUploadList={false}
        beforeUpload={(_, fileList) => {
          handleUpload(fileList as unknown as File[]);
          return false;
        }}
        style={{
          borderRadius: 24,
          border: `1px dashed ${token.colorBorder}`,
          background: token.colorBgLayout,
          padding: '18px 12px',
        }}
      >
        <p><InboxOutlined style={{ fontSize: 36, color: token.colorPrimary }} /></p>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>添加任意内容</p>
        <p style={{ fontSize: 12, color: token.colorTextSecondary }}>
          将任意文件拖放到此处，以将其添加到对话中
        </p>
      </Dragger>
    </div>
  );
}
