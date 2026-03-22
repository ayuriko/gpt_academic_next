'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Button, Tooltip, message } from 'antd';
import { SoundOutlined, LoadingOutlined, PauseOutlined } from '@ant-design/icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:38001/api/v1';

export default function TTSPlayer({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = useCallback(async () => {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
      return;
    }

    if (!text.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 2000) }),
      });

      if (!res.ok) {
        message.error('TTS 服务不可用');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onended = () => {
        setPlaying(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setPlaying(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
        message.error('音频播放失败');
      };

      audioRef.current = audio;
      await audio.play();
      setPlaying(true);
    } catch {
      message.error('TTS 请求失败');
    } finally {
      setLoading(false);
    }
  }, [text, playing]);

  return (
    <Tooltip title={playing ? '停止朗读' : '朗读'}>
      <Button
        type="text"
        size="small"
        icon={loading ? <LoadingOutlined /> : playing ? <PauseOutlined /> : <SoundOutlined />}
        onClick={handlePlay}
        disabled={loading || !text.trim()}
        style={{ opacity: 0.6 }}
      />
    </Tooltip>
  );
}
