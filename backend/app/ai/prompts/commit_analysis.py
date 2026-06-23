from langchain.prompts import ChatPromptTemplate

COMMIT_ANALYSIS_SYSTEM = """You are RepoMind, an expert code analyst specializing in understanding software changes.
Analyze the provided Git commit and produce structured intelligence about this change.
Be precise, technical, and concise. Focus on the WHY, not just the WHAT.
Always respond in valid JSON matching the schema provided."""

COMMIT_ANALYSIS_HUMAN = """Analyze this Git commit:

Repository: {repo_name}
Branch: {branch}
Author: {author}
Commit Message: {message}
Files Changed: {files_changed}
Additions: {additions}
Deletions: {deletions}

Diff:
{diff}

Respond with a JSON object using exactly this schema:
{{
  "summary": "One sentence describing the commit",
  "what_changed": "Technical description of what code changed (2-4 sentences)",
  "why_changed": "Your inference about WHY this change was made (2-3 sentences)",
  "impact": "Impact on the system — what breaks, what improves, what depends on this (2-3 sentences)",
  "risk_level": "low | medium | high | critical",
  "related_files": ["list", "of", "key", "file", "paths"],
  "key_patterns": ["architectural patterns or keywords like 'authentication', 'database', 'api', 'bug-fix'"]
}}"""

commit_analysis_prompt = ChatPromptTemplate.from_messages([
    ("system", COMMIT_ANALYSIS_SYSTEM),
    ("human", COMMIT_ANALYSIS_HUMAN),
])
