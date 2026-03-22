import uuid
from toolbox import get_conf


class SessionManager:
    def __init__(self):
        self._sessions: dict[str, dict] = {}

    def _build_default_session(self) -> dict:
        API_KEY, LLM_MODEL, EMBEDDING_MODEL = get_conf("API_KEY", "LLM_MODEL", "EMBEDDING_MODEL")
        return {
            "api_key": API_KEY,
            "llm_model": LLM_MODEL,
            "embed_model": EMBEDDING_MODEL,
            "top_p": 1.0,
            "temperature": 1.0,
            "max_length": None,
            "uuid": uuid.uuid4(),
        }

    def create_session(self, sid: str | None = None) -> tuple[str, dict]:
        sid = sid or uuid.uuid4().hex
        data = self._build_default_session()
        self._sessions[sid] = data
        return sid, data

    def get_session(self, sid: str) -> dict | None:
        return self._sessions.get(sid)

    def update_session(self, sid: str, data: dict):
        if sid in self._sessions:
            self._sessions[sid].update(data)

    def get_or_create(self, sid: str | None) -> tuple[str, dict]:
        if sid and sid in self._sessions:
            return sid, self._sessions[sid]
        return self.create_session(sid)


session_manager = SessionManager()
