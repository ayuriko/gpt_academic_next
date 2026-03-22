<div align="center">

# GPT Academic Next

**基于 Next.js + Ant Design 的现代化 AI 学术助手**

[![License](https://img.shields.io/github/license/ayuriko/gpt_academic?style=flat-square)](LICENSE)

</div>

---

> **声明**：本项目基于 [binary-husky/gpt_academic](https://github.com/binary-husky/gpt_academic/tree/master) 修改开发。感谢原作者及所有贡献者的优秀工作。

## 与原项目的区别

| | 原项目 (GPT Academic) | 本项目 (GPT Academic Next) |
|---|---|---|
| 前端 | Gradio 3.32.15 | **Next.js 16 + Ant Design 5** |
| UI 风格 | Gradio 默认 | **ChatGPT 风格**（侧边栏 + 对话区） |
| 后端 API | Gradio 内置 | **FastAPI REST + SSE 流式** |
| 主题 | CSS 注入 | **Ant Design 亮/暗主题切换** |
| 状态管理 | Gradio State + Cookies | **Zustand + localStorage** |
| 模型支持 | GPT-4o 及以下 | **GPT-5.4 全系列 + 50+ 模型** |

## 支持的模型

GPT-5.4, GPT-5.3 Codex, GPT-5.2, GPT-5.1, GPT-5, GPT-4.1, GPT-4o, o3, o4-mini, DeepSeek-R1, Qwen-Max, GLM-4, Gemini 等 50+ 模型

## 快速开始

### 1. 配置

复制配置文件并填写 API Key：

```bash
cp config.py config_private.py
```

编辑 `config_private.py`，填写：
- `API_KEY` — OpenAI 或兼容 API 的密钥
- `API_URL_REDIRECT` — 如使用中转服务，填写重定向地址
- `LLM_MODEL` — 默认模型
- `AVAIL_LLM_MODELS` — 可用模型列表

### 2. 安装依赖

```bash
# Python 后端
pip install -r requirements.txt

# Next.js 前端
cd frontend && npm install
```

### 3. 启动

```bash
# 一键启动（前后端同时）
python main.py
```

- 前端地址：`http://localhost:52173`
- API 地址：`http://localhost:48621/docs`

或者分别启动：

```bash
# 终端 1：API 服务器
python main.py

# 终端 2：前端开发服务器
cd frontend && npm run dev
```

## 项目结构

```
├── main.py                 # 入口（启动 API + 前端）
├── config.py               # 默认配置
├── config_private.py       # 私有配置（不上传 git）
├── api_server/             # FastAPI 后端
│   ├── app.py              # 主应用
│   ├── sse_helpers.py      # SSE 流式工具
│   ├── session.py          # 会话管理
│   └── routes/             # API 路由
│       ├── chat.py         # POST /api/v1/chat/stream
│       ├── config.py       # GET  /api/v1/config
│       ├── plugins.py      # GET  /api/v1/plugins
│       ├── upload.py       # POST /api/v1/upload
│       ├── files.py        # GET  /api/v1/files/{path}
│       ├── tts.py          # POST /api/v1/tts
│       └── auth.py         # POST /api/v1/auth/login
├── frontend/               # Next.js 前端
│   └── src/
│       ├── app/            # 页面路由
│       ├── components/     # UI 组件
│       ├── stores/         # Zustand 状态管理
│       ├── hooks/          # React Hooks
│       └── lib/            # 工具库
├── request_llms/           # LLM 桥接层（50+ 模型）
├── crazy_functions/        # 插件系统（50+ 插件）
└── shared_utils/           # 公共工具
```

## 功能

- **流式对话** — SSE 实时流式输出，打字机效果
- **50+ 插件** — 论文翻译、代码分析、PDF 阅读、Latex 润色等
- **文件上传** — 拖拽上传，支持 ZIP/PDF/Word 等
- **TTS 朗读** — Edge TTS 语音合成
- **语音输入** — 浏览器麦克风录音
- **暗色主题** — 一键切换亮/暗模式
- **对话管理** — 本地保存，搜索历史对话
- **多模型** — 支持 OpenAI、DeepSeek、通义、智谱、Gemini 等

## License

本项目遵循 [GPL-3.0](LICENSE) 开源协议，与原项目保持一致。
