import json
from starlette.responses import StreamingResponse


def sse_generator(predict_generator):
    """Wrap a predict() generator yielding (cookies, chatbot, history, msg) into SSE events."""
    def event_stream():
        try:
            for cookies, chatbot, history, msg in predict_generator:
                # chatbot is a list of [user, bot] pairs
                # history is a JSON string of the history list
                chatbot_data = []
                if hasattr(chatbot, 'get_cookies'):
                    chatbot_data = list(chatbot)
                else:
                    chatbot_data = chatbot if isinstance(chatbot, list) else []

                try:
                    history_data = json.loads(history) if isinstance(history, str) else history
                except (json.JSONDecodeError, TypeError):
                    history_data = history if isinstance(history, list) else []

                event = {
                    "chatbot": chatbot_data,
                    "history": history_data,
                    "msg": str(msg) if msg else "",
                }
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as e:
            error_event = {"chatbot": [], "history": [], "msg": f"Error: {str(e)}"}
            yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
