'use client';

import React from 'react';
import { Modal, Form, Input, Typography } from 'antd';
import { PluginInfo } from '@/lib/types';

const { TextArea } = Input;
const { Text } = Typography;

export default function PluginArgModal({
  open,
  pluginName,
  plugin,
  mainInput,
  onOk,
  onCancel,
}: {
  open: boolean;
  pluginName: string;
  plugin: PluginInfo;
  mainInput: string;
  onOk: (args: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const [form] = Form.useForm();

  const handleOk = () => {
    form.validateFields().then((values) => {
      onOk({
        main_input: values.main_input || mainInput,
        advanced_arg: values.advanced_arg || '',
      });
      form.resetFields();
    });
  };

  return (
    <Modal
      title={`插件参数 - ${pluginName}`}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText="执行"
      cancelText="取消"
      width={520}
    >
      {plugin.args_reminder && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
          {plugin.args_reminder}
        </Text>
      )}
      <Form form={form} layout="vertical" initialValues={{ main_input: mainInput }}>
        <Form.Item label="输入" name="main_input">
          <TextArea rows={3} placeholder="输入文本或文件路径..." />
        </Form.Item>
        {plugin.advanced_args && (
          <Form.Item label="高级参数" name="advanced_arg">
            <TextArea rows={2} placeholder="高级参数..." />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
