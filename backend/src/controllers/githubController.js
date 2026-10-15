import github from "../services/githubClient.js";
import handleGitHubError from "../utils/githubError.js";
import * as searchCache from "../utils/searchCache.js";

export const search = async (req, res) => {
  const q = String(req.query.q || "").trim();
  const sort = String(req.query.sort || "stars");
  const page = Number(req.query.page || 1);

  if (!q || q.length > 256) {
    return res.status(400).json({
      success: false,
      message: "A search keyword between 1 and 256 characters is required.",
    });
  }

  if (!Number.isInteger(page) || page < 1 || page > 100) {
    return res.status(400).json({
      success: false,
      message: "Page must be an integer between 1 and 100.",
    });
  }

  if (!["stars", "updated"].includes(sort)) {
    return res.status(400).json({
      success: false,
      message: "Sort must be stars or updated.",
    });
  }


  // caching the data  
  const cacheKey = JSON.stringify({ q: q.toLowerCase(), page, sort });
  const cached = searchCache.get(cacheKey);

  if (cached) return res.json({ ...cached, cached: true });

  const existingRequest = searchCache.getInFlight(cacheKey);

  if (existingRequest) {
    try {
      const data = await existingRequest;
      return res.json({ ...data, cached: true });
    } catch (error) {
      return handleGitHubError(error, res);
    }
  }

  // calling the github api 
  const request = github
    .get("/search/repositories", {
      params: { q, page, per_page: 10, sort, order: "desc" },
    })
    .then((response) => {
      const data = {
        success: true,
        totalCount: response.data.total_count,
        items: response.data.items.map((repo) => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          url: repo.html_url,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          updatedAt: repo.updated_at,
        })),
        page,
        perPage: 10,
      };

      searchCache.set(cacheKey, data);
      return data;
    });

  searchCache.setInFlight(cacheKey, request);

  try {
    const data = await request;
    return res.json({ ...data, cached: false });
  } catch (error) {
    return handleGitHubError(error, res);
  } finally {
    searchCache.clearInFlight(cacheKey);
  }
};
