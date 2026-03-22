import os; os.environ['no_proxy'] = '*'
import subprocess
import time
import uvicorn
from loguru import logger
from api_server.app import app

FRONTEND_PORT = 52173
API_PORT = 48621


def start_frontend():
    """Start Next.js frontend dev server or serve production build."""
    frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend')
    if not os.path.isdir(frontend_dir):
        logger.warning("frontend/ 目录不存在，跳过前端启动")
        return False

    next_dir = os.path.join(frontend_dir, '.next')
    if os.path.isdir(next_dir):
        cmd = ["npm", "run", "start"]
        mode = "生产"
    else:
        cmd = ["npm", "run", "dev"]
        mode = "开发"

    try:
        proc = subprocess.Popen(
            cmd,
            cwd=frontend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        # Wait briefly and check if process started OK
        time.sleep(2)
        if proc.poll() is not None:
            output = proc.stdout.read().decode() if proc.stdout else ""
            logger.error(f"前端启动失败:\n{output}")
            return False
        logger.info(f"Next.js {mode}服务器已启动 → http://localhost:{FRONTEND_PORT}")
        return True
    except FileNotFoundError:
        logger.error("npm 未找到，请确保 Node.js 已安装并在 PATH 中")
        return False


if __name__ == "__main__":
    print()
    logger.info("=" * 50)
    logger.info("  GPT Academic Next")
    logger.info("=" * 50)
    print()

    # Start frontend first
    logger.info(f"[1/2] 启动前端服务器...")
    frontend_ok = start_frontend()
    if not frontend_ok:
        logger.warning("前端未启动，仅启动 API 服务器")

    # Start API server
    print()
    logger.info(f"[2/2] 启动 API 服务器...")
    logger.info(f"  前端: http://localhost:{FRONTEND_PORT}" + (" ✓" if frontend_ok else " ✗"))
    logger.info(f"  API:  http://localhost:{API_PORT}/docs")
    logger.info(f"  按 Ctrl+C 停止")
    print()

    uvicorn.run(app, host="0.0.0.0", port=API_PORT)
