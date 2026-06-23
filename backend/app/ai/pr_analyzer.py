import json
import logging
from dataclasses import dataclass

from langchain_anthropic import ChatAnthropic

from app.config import settings
from app.ai.prompts.pr_analysis import pr_analysis_prompt
from app.core.exceptions import AIServiceError

logger = logging.getLogger(__name__)


@dataclass
class PRAnalysisResult:
    summary: str
    impact: str
    risk_level: str
    risk_reasons: list[str]


async def analyze_pr(
    repo_name: str,
    title: str,
    number: int,
    author: str,
    state: str,
    base_branch: str,
    head_branch: str,
    body: str,
) -> PRAnalysisResult:
    llm = ChatAnthropic(
        model=settings.anthropic_model,
        anthropic_api_key=settings.anthropic_api_key,
    )

    chain = pr_analysis_prompt | llm

    try:
        response = await chain.ainvoke({
            "repo_name": repo_name,
            "title": title,
            "number": number,
            "author": author,
            "state": state,
            "base_branch": base_branch,
            "head_branch": head_branch,
            "body": (body or "")[:3000],
        })

        raw = response.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        data = json.loads(raw)

        return PRAnalysisResult(
            summary=data.get("summary", ""),
            impact=data.get("impact", ""),
            risk_level=data.get("risk_level", "low"),
            risk_reasons=data.get("risk_reasons", []),
        )

    except json.JSONDecodeError as e:
        logger.error("Failed to parse PR analysis JSON: %s", e)
        raise AIServiceError("Failed to parse PR analysis response")
    except Exception as e:
        logger.error("PR analysis failed: %s", e)
        raise AIServiceError(str(e))
