from fastapi import APIRouter
from toolbox import get_conf
from core_functional import get_core_functions
from crazy_functional import get_crazy_functions

router = APIRouter()


@router.get("/config")
async def get_config():
    AVAIL_LLM_MODELS, LLM_MODEL, DEFAULT_FN_GROUPS = get_conf(
        "AVAIL_LLM_MODELS", "LLM_MODEL", "DEFAULT_FN_GROUPS"
    )
    TTS_TYPE, ENABLE_AUDIO = get_conf("TTS_TYPE", "ENABLE_AUDIO")

    # Core functions (strip non-serializable keys)
    raw_fns = get_core_functions()
    core_fns = {}
    for k, v in raw_fns.items():
        core_fns[k] = {
            "Prefix": v.get("Prefix", ""),
            "Suffix": v.get("Suffix", ""),
            "Color": v.get("Color", "secondary"),
        }

    return {
        "avail_llm_models": AVAIL_LLM_MODELS,
        "default_model": LLM_MODEL,
        "core_functions": core_fns,
        "default_fn_groups": DEFAULT_FN_GROUPS,
        "tts_type": TTS_TYPE,
        "enable_audio": ENABLE_AUDIO,
    }
