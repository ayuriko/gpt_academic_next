from fastapi import APIRouter
from crazy_functional import get_crazy_functions

router = APIRouter()


@router.get("/plugins")
async def get_plugins():
    raw = get_crazy_functions()
    result = {}
    for k, v in raw.items():
        result[k] = {
            "group": v.get("Group", ""),
            "color": v.get("Color", "secondary"),
            "as_button": v.get("AsButton", True),
            "info": v.get("Info", k),
            "advanced_args": v.get("AdvancedArgs", False),
            "args_reminder": v.get("ArgsReminder", ""),
        }
    return result
