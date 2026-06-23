from fastapi import Request
from fastapi.responses import JSONResponse


class RepoMindException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(RepoMindException):
    def __init__(self, resource: str):
        super().__init__(f"{resource} not found", status_code=404)


class UnauthorizedError(RepoMindException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status_code=401)


class GitHubAPIError(RepoMindException):
    def __init__(self, message: str):
        super().__init__(f"GitHub API error: {message}", status_code=502)


class AIServiceError(RepoMindException):
    def __init__(self, message: str):
        super().__init__(f"AI service error: {message}", status_code=503)


async def repomind_exception_handler(
    request: Request, exc: RepoMindException
) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "type": type(exc).__name__},
    )
