import json
import logging
from dataclasses import dataclass

from langchain_anthropic import ChatAnthropic

from app.config import settings
from app.ai.prompts.commit_analysis import commit_analysis_prompt
from app.core.exceptions import AIServiceError

logger = logging.getLogger(__name__)


@dataclass
class CommitAnalysisResult:
    summary: str
    what_changed: str
    why_changed: str
    impact: str
    risk_level: str
    related_files: list[str]
    key_patterns: list[str]


async def analyze_commit(
    repo_name: str,
    branch: str,
    author: str,
    message: str,
    diff: str,
    files_changed: int,
    additions: int,
    deletions: int,
) -> CommitAnalysisResult:
    llm = ChatAnthropic(
        model=settings.anthropic_model,
        anthropic_api_key=settings.anthropic_api_key,
    )

    # Truncate diff to stay within token limits (~12k chars ≈ 3k tokens for diff)
    truncated_diff = diff[:12000] if len(diff) > 12000 else diff
    if len(diff) > 12000:
        truncated_diff += "\n\n[Diff truncated for length]"

    chain = commit_analysis_prompt | llm

    try:
        response = await chain.ainvoke({
            "repo_name": repo_name,
            "branch": branch,
            "author": author,
            "message": message,
            "diff": truncated_diff,
            "files_changed": files_changed,
            "additions": additions,
            "deletions": deletions,
        })

        raw = response.content.strip()
        # Strip markdown code fences if model wraps the JSON
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        data = json.loads(raw)

        return CommitAnalysisResult(
            summary=data.get("summary", ""),
            what_changed=data.get("what_changed", ""),
            why_changed=data.get("why_changed", ""),
            impact=data.get("impact", ""),
            risk_level=data.get("risk_level", "low"),
            related_files=data.get("related_files", []),
            key_patterns=data.get("key_patterns", []),
        )

    except json.JSONDecodeError as e:
        logger.error("Failed to parse commit analysis JSON: %s", e)
        raise AIServiceError("Failed to parse commit analysis response")
    except Exception as e:
        logger.error("Commit analysis failed: %s", e)
        raise AIServiceError(str(e))
