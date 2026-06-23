from langchain_huggingface import HuggingFaceEmbeddings


def get_embedding_model() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
    )


def build_commit_document(commit) -> str:
    """Build a rich text document for embedding from a commit."""
    parts = [
        f"Repository: {commit.repository.full_name if hasattr(commit, 'repository') else ''}",
        f"SHA: {commit.sha}",
        f"Author: {commit.author_name or commit.author_login or 'Unknown'}",
        f"Branch: {commit.branch or 'unknown'}",
        f"Message: {commit.message or ''}",
        f"Files changed: {commit.files_changed}",
    ]
    if commit.ai_summary:
        parts.append(f"Summary: {commit.ai_summary}")
    if commit.ai_what_changed:
        parts.append(f"What changed: {commit.ai_what_changed}")
    if commit.ai_why_changed:
        parts.append(f"Why: {commit.ai_why_changed}")
    if commit.ai_impact:
        parts.append(f"Impact: {commit.ai_impact}")
    if commit.ai_risk_level:
        parts.append(f"Risk: {commit.ai_risk_level}")
    return "\n".join(parts)


def build_pr_document(pr) -> str:
    """Build a rich text document for embedding from a pull request."""
    parts = [
        f"PR #{pr.number}: {pr.title or ''}",
        f"Author: {pr.author_login or 'Unknown'}",
        f"State: {pr.state or 'unknown'}",
        f"Base: {pr.base_branch} ← {pr.head_branch}",
        f"Body: {(pr.body or '')[:500]}",
    ]
    if pr.ai_summary:
        parts.append(f"Summary: {pr.ai_summary}")
    if pr.ai_impact:
        parts.append(f"Impact: {pr.ai_impact}")
    return "\n".join(parts)
