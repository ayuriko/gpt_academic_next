'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button, Tooltip, message, theme } from 'antd';
import { AudioOutlined, AudioMutedOutlined, LoadingOutlined } from '@ant-design/icons';

export default function VoiceInput({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { token } = theme.useToken();

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setSupported(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

        if (blob.size < 1000) {
          message.warning('录音太短');
          return;
        }

        // For now, use Web Speech API as fallback for transcription
        // In production, POST blob to /api/v1/audio/transcribe
        message.info('语音识别需要后端支持 (Whisper API)');
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
    } catch {
      message.error('无法访问麦克风');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  if (!supported) return null;

  return (
    <Tooltip title={recording ? '停止录音' : '语音输入'}>
      <Button
        type="text"
        icon={recording ? <AudioMutedOutlined style={{ color: token.colorError }} /> : <AudioOutlined />}
        onClick={recording ? stopRecording : startRecording}
        style={{
          marginBottom: 4,
          ...(recording ? { animation: 'pulse 1.5s infinite' } : {}),
        }}
      />
    </Tooltip>
  );
}
