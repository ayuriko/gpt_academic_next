'use client';

import React, { useState, useCallback } from 'react';
import { Upload, message, List, Button, theme, Typography } from 'antd';
import { InboxOutlined, FileOutlined, DownloadOutlined } from '@ant-design/icons';
import { uploadFiles, getFileUrl } from '@/lib/api';
import type { UploadFile } from 'antd/es/upload/interface';

const { Dragger } = Upload;
const { Text } = Typography;

export default function FileUpload({
  onUploaded,
}: {
  onUploaded?: (paths: string[]) => void;
}) {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const { token } = theme.useToken();

  const handleUpload = useCallback(async (fileList: File[]) => {
    if (fileList.length === 0) return;
    setUploading(true);
    try {
      const result = await uploadFiles(fileList);
      setUploadedFiles((prev) => [...prev, ...result.paths]);
      onUploaded?.(result.paths);
      message.success(`已上传 ${fileList.length} 个文件`);
    } catch {
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
  }, [onUploaded]);

  return (
    <div>
      <Dragger
        multiple
        showUploadList={false}
        beforeUpload={(_, fileList) => {
          handleUpload(fileList as unknown as File[]);
          return false;
        }}
        style={{ borderRadius: 8 }}
      >
        <p><InboxOutlined style={{ fontSize: 36, color: token.colorPrimary }} /></p>
        <p style={{ fontSize: 14 }}>点击或拖拽文件到此处上传</p>
        <p style={{ fontSize: 12, color: token.colorTextSecondary }}>
          支持任意文件，推荐上传压缩文件 (zip, tar)
        </p>
      </Dragger>

      {uploadedFiles.length > 0 && (
        <List
          size="small"
          style={{ marginTop: 12 }}
          dataSource={uploadedFiles}
          renderItem={(path) => {
            const name = path.split('/').pop() || path;
            return (
              <List.Item
                actions={[
                  <Button
                    key="dl"
                    type="link"
                    size="small"
                    icon={<DownloadOutlined />}
                    href={getFileUrl(path)}
                    target="_blank"
                  />,
                ]}
              >
                <List.Item.Meta
                  avatar={<FileOutlined />}
                  title={<Text ellipsis style={{ fontSize: 13 }}>{name}</Text>}
                />
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );
}
