from langchain.prompts import ChatPromptTemplate

PR_ANALYSIS_SYSTEM = """You are RepoMind, an expert code analyst. Analyze pull requests to generate
actionable insights about what is being merged, why, and the risk it carries.
Always respond in valid JSON matching the schema provided."""

PR_ANALYSIS_HUMAN = """Analyze this Pull Request:

Repository: {repo_name}
PR Title: {title}
PR Number: #{number}
Author: {author}
State: {state}
Base Branch: {base_branch}
Head Branch: {head_branch}

PR Description:
{body}

Respond with a JSON object using exactly this schema:
{{
  "summary": "One sentence summary of the PR",
  "impact": "What this PR changes in the system (2-3 sentences)",
  "risk_level": "low | medium | high | critical",
  "risk_reasons": ["reason1", "reason2"]
}}"""

pr_analysis_prompt = ChatPromptTemplate.from_messages([
    ("system", PR_ANALYSIS_SYSTEM),
    ("human", PR_ANALYSIS_HUMAN),
])
