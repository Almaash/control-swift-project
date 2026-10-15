import github from "../services/githubClient.js";
import handleGitHubError from "../utils/githubError.js";

const validName = /^[A-Za-z0-9_.-]+$/;

export const getRepository = async (req, res) => {
  const { owner, repo } = req.params;

  if (
    !validName.test(owner) ||
    !validName.test(repo) ||
    owner.length > 100 ||
    repo.length > 100
  ) {
    return res.status(400).json({
      success: false,
      code: "INVALID_REPOSITORY_NAME",
      message: "Invalid repository owner or name.",
    });
  }

  try {
    const [repositoryResult, commitsResult, contributorsResult, issuesResult] =
      await Promise.all([
        github.get(`/repos/${owner}/${repo}`),
        github.get(`/repos/${owner}/${repo}/commits`, { params: { per_page: 5 } }),
        github.get(`/repos/${owner}/${repo}/contributors`, { params: { per_page: 5 } }),
        github.get("/search/issues", {
          params: { q: `repo:${owner}/${repo} type:issue state:open`, per_page: 1 },
        }),
      ]);

    const repository = repositoryResult.data;

    return res.json({
      success: true,
      repository: {
        id: repository.id,
        name: repository.name,
        fullName: repository.full_name,
        description: repository.description,
        url: repository.html_url,
        homepage: repository.homepage,
        stars: repository.stargazers_count,
        forks: repository.forks_count,
        language: repository.language,
        defaultBranch: repository.default_branch,
        createdAt: repository.created_at,
        updatedAt: repository.updated_at,
      },
      commits: commitsResult.data.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author?.name || commit.author?.login || "Unknown author",
        date: commit.commit.author?.date || null,
        url: commit.html_url,
      })),
      contributors: contributorsResult.data.map((contributor) => ({
        id: contributor.id,
        username: contributor.login,
        avatar: contributor.avatar_url,
        profileUrl: contributor.html_url,
        contributions: contributor.contributions,
      })),
      openIssuesCount: issuesResult.data.total_count,
    });
  } catch (error) {
    return handleGitHubError(error, res);
  }
};
