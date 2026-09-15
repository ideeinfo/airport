from __future__ import annotations

import asyncio
import re
from typing import Any

import httpx

from .config import settings
from .store import read_json

EXCLUDED_DOCUMENTS = {"消防（土建航站楼火自报243）.pdf"}
REASONING_TAGS = "thought|think|reasoning|analysis"
REASONING_BLOCK = re.compile(rf"<(?P<tag>{REASONING_TAGS})\b[^>]*>.*?</(?P=tag)\s*>", re.IGNORECASE | re.DOTALL)
UNCLOSED_REASONING = re.compile(rf"<({REASONING_TAGS})\b[^>]*>", re.IGNORECASE)
REASONING_TAG = re.compile(rf"</?({REASONING_TAGS})\b[^>]*>", re.IGNORECASE)
FINAL_TAG = re.compile(r"</?final\b[^>]*>", re.IGNORECASE)


def _keywords(text: str) -> set[str]:
    tokens = {token.casefold() for token in re.findall(r"[A-Za-z0-9_\-]{2,}", text)}
    for phrase in re.findall(r"[\u4e00-\u9fff]{2,}", text):
        tokens.add(phrase)
        tokens.update(phrase[index : index + 2] for index in range(len(phrase) - 1))
    return tokens


def clean_model_answer(content: Any) -> str:
    text = str(content or "").strip()
    text = REASONING_BLOCK.sub("", text)
    unclosed = UNCLOSED_REASONING.search(text)
    if unclosed:
        text = text[: unclosed.start()]
    text = REASONING_TAG.sub("", text)
    text = FINAL_TAG.sub("", text).strip()
    return text or "模型未返回可展示的最终答案，请重新提问。"


def retrieve(question: str, limit: int = 4) -> list[dict[str, Any]]:
    chunks = read_json("corpus.json", [])
    wanted = _keywords(question)
    ranked: list[tuple[int, dict[str, Any]]] = []
    for chunk in chunks:
        if chunk.get("document") in EXCLUDED_DOCUMENTS:
            continue
        content = str(chunk.get("content", ""))
        score = len(wanted & _keywords(content))
        if "AHU" in question.upper() and any(word in content for word in ("空调", "过滤器", "风量")):
            score += 3
        if score:
            ranked.append((score, chunk))
    return [chunk for _, chunk in sorted(ranked, key=lambda item: -item[0])[:limit]]


def fallback_answer(question: str, evidence: list[dict[str, Any]]) -> dict[str, Any]:
    is_airflow = any(word in question for word in ("风量", "过滤器", "空调机组", "AHU"))
    if "5466537" in question:
        answer = (
            "送风口 5466537 应先用风量罩复测，核对仪器零点、风口尺寸和测量时间，"
            "再与设计图、调试报告或已确认的 850 m³/h 参考值比较。若偏差仍大，继续检查上游风管 5466492。"
        )
        steps = ["使用风量罩连续复测三次", "核对风口尺寸与百叶角度", "对照设计或调试基准", "检查上游风管 5466492"]
    elif "5466492" in question:
        answer = (
            "风管 5466492 疑似漏风时，应先检查法兰、咬口、软接和检修门，再比较该段上下游的风量与静压。"
            "可使用烟雾、风速仪或微压计定位；最终允许漏风量应以设计文件和机场验收标准为准。"
        )
        steps = ["检查法兰、咬口和软接", "用烟雾定位可见泄漏点", "测量上下游风量与静压", "按已确认标准进行密封处理"]
    elif "5500084" in question:
        answer = (
            "阀门 5500084 出现卡滞时，先确认系统已处于可安全操作状态，再核对阀门开度、阀杆行程和执行器反馈。"
            "不应强行扭动；需同时检查异物阻塞、锈蚀、填料函和法兰渗漏。"
        )
        steps = ["隔离系统并确认安全条件", "核对开度指令与行程反馈", "检查阀杆、执行器与密封部位", "手动试动后记录全行程结果"]
    elif "5466510" in question:
        answer = (
            "波纹补偿器 5466510 的巡检重点是波纹管变形、腐蚀、渗漏和异常振动，以及导向支架、固定支架与连接件是否松动。"
            "位移量、压力和温度边界必须以设计参数及厂家资料为准。"
        )
        steps = ["检查波纹管变形、腐蚀与渗漏", "检查固定和导向支架", "记录异常振动与位移", "对照设计参数和厂家限值"]
    elif is_airflow:
        answer = (
            "建议先核验过滤器压差与洁净度，再检查换热器表面积尘、送风机指令/反馈、风阀实际开度及冷冻水阀状态。"
            "当前 Demo 点位 FIL_DP 为 286 Pa，过滤段应作为首要排查对象；最终阈值需以设备铭牌、设计参数和维护手册为准。"
        )
        steps = ["检查并清洗或更换过滤器", "清洁换热器表面", "核对送风机与风阀状态", "对照设备样本确认终阻力阈值"]
    else:
        answer = "已从机场机电运维资料中检索到相关内容。请结合设备编码、所在系统和现场状态进一步确认。"
        steps = ["确认设备编码与安装位置", "核对关联图纸和系统", "按资料要求检查现场状态"]
    return {"answer": answer, "steps": steps, "evidence": evidence, "provider": "local-retrieval"}


async def ask(question: str) -> dict[str, Any]:
    evidence = retrieve(question)
    if not (settings.open_webui_api_key and settings.open_webui_model):
        return fallback_answer(question, evidence)

    files = []
    if settings.open_webui_knowledge_id:
        files.append({"type": "collection", "id": settings.open_webui_knowledge_id})
    payload = {
        "model": settings.open_webui_model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是呼和浩特机场机电运维助手。只基于绑定知识库回答，给出可执行步骤，并明确不确定信息。"
                    "不要输出思考过程或任何 thought、think、reasoning、analysis 标签，直接给出面向运维人员的最终答案。"
                ),
            },
            {"role": "user", "content": question},
        ],
        "stream": False,
        "files": files,
    }
    headers = {"Authorization": f"Bearer {settings.open_webui_api_key}"}
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(f"{settings.open_webui_url}/api/chat/completions", json=payload, headers=headers)
            response.raise_for_status()
            body = response.json()
        content = clean_model_answer(body["choices"][0]["message"]["content"])
        return {"answer": content, "steps": [], "evidence": evidence, "provider": "open-webui"}
    except (httpx.HTTPError, KeyError, IndexError, TypeError):
        await asyncio.sleep(0)
        result = fallback_answer(question, evidence)
        result["provider"] = "local-retrieval-fallback"
        return result
