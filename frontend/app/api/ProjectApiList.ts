const ProjectApiList = {
  // Auth
  login: "/api/auth/login",
  register: "/api/auth/register",
  logout: "/api/auth/logout",
  // me: "/api/auth/me",

  // GitHub search
  searchRepos: "/api/github-analytics/search",

  // Repository details
  repoDetails: "/api/repositories",

  // Favourites
  getFavourites: "/api/favourites",
  addFavourite: "/api/favourites",
  checkFavourite: "/api/favourites",
  removeFavourite: "/api/favourites",
};

export default ProjectApiList;
