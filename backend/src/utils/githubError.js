function handleGitHubError(error, res) {
  const status = error.response?.status;
  const headers = error.response?.headers || {};
  const githubMessage = String(error.response?.data?.message || "").toLowerCase();

  const isRateLimited =
    status === 429 ||
    (status === 403 &&
      (headers["x-ratelimit-remaining"] === "0" ||
        Boolean(headers["retry-after"]) ||
        githubMessage.includes("rate limit")));

  if (error.code === "ECONNABORTED") {
    return res.status(504).json({
      success: false,
      code: "GITHUB_TIMEOUT",
      message: "GitHub took too long to respond. Please try again.",
    });
  }

  if (!error.response) {
    return res.status(502).json({
      success: false,
      code: "GITHUB_UNAVAILABLE",
      message: "Unable to connect to GitHub. Please try again later.",
    });
  }

  if (isRateLimited) {
    const resetAt = Number(headers["x-ratelimit-reset"]);
    const retryAfter = headers["retry-after"];

    return res.status(429).json({
      success: false,
      code: "GITHUB_RATE_LIMIT",
      message: "GitHub rate limit reached. Please try again later.",
      retryAfterSeconds: retryAfter
        ? Number(retryAfter)
        : Number.isFinite(resetAt) && resetAt > 0
          ? Math.max(0, resetAt - Math.floor(Date.now() / 1000))
          : null,
    });
  }

  if (status === 404) {
    return res.status(404).json({
      success: false,
      code: "REPOSITORY_NOT_FOUND",
      message: "The repository was not found or is no longer accessible.",
    });
  }

  if (status === 422) {
    return res.status(400).json({
      success: false,
      code: "INVALID_GITHUB_REQUEST",
      message: "GitHub could not process this request.",
    });
  }

  if (status === 401) {
    console.error("GitHub authentication failed. Check GITHUB_TOKEN.");
    return res.status(502).json({
      success: false,
      code: "GITHUB_AUTH_ERROR",
      message: "GitHub authentication failed. Please try again later.",
    });
  }

  console.error("GitHub API error:", status, error.message);

  return res.status(502).json({
    success: false,
    code: "GITHUB_API_ERROR",
    message: "GitHub could not complete the request.",
  });
}

export default handleGitHubError;
