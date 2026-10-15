
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Navbar from "./components/Navbar";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "./context/AuthContext";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

type Repository = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  updatedAt: string;
};

type SearchResponse = {
  success: boolean;
  totalCount: number;
  items: Repository[];
  page: number;
  perPage: number;
  cached?: boolean;
  message?: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 100000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unknown"
    : date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
}

function initials(fullName: string) {
  return fullName.split("/").pop()?.slice(0, 2).toUpperCase() || "RI";
}

function RepositorySkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading repositories">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-slate-100" />
              <div className="h-3 w-2/3 rounded bg-slate-100" />
            </div>
            <div className="h-8 w-20 rounded-lg bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [query, setQuery] = useState("react");
  const [searchTerm, setSearchTerm] = useState("react");
  const [sort, setSort] = useState("stars");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<Repository[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cached, setCached] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [savingId, setSavingId] = useState<number | null>(null);
  const [confirmRepo, setConfirmRepo] = useState<Repository | null>(null);
  const [favouriteMessage, setFavouriteMessage] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">(
    "success"
  );

  // Only fetch once auth is confirmed — prevents double-call from ProtectedPage mount/unmount
  useEffect(() => {
    if (!user) return;
    if (!searchTerm.trim()) {
      setItems([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchRepositories() {
      setLoading(true);
      setError("");
      setFavouriteMessage("");

      try {
        const { data } = await axiosInstance.get(ProjectApiList.searchRepos, {
          params: { q: searchTerm, page, sort },
          signal: controller.signal,
        });

        if (!data.success) {
          if (data.code === "GITHUB_RATE_LIMIT") throw new Error("GitHub rate limit reached. Please wait before searching again.");
          throw new Error(data.message || "Unable to fetch repositories.");
        }

        setItems(Array.isArray(data.items) ? data.items : []);
        setTotalCount(data.totalCount || 0);
        setCached(Boolean(data.cached));
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === "CanceledError") return;
        setItems([]);
        setTotalCount(0);
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          (err instanceof Error ? err.message : "Something went wrong.")
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchRepositories();

    return () => controller.abort();
  }, [searchTerm, page, sort, user, refreshKey]);

  const totalPages = Math.min(100, Math.ceil(totalCount / 10));

  const visibleStars = useMemo(
    () => items.reduce((total, repo) => total + repo.stars, 0),
    [items]
  );

  const languageCount = useMemo(
    () => new Set(items.map((repo) => repo.language).filter(Boolean)).size,
    [items]
  );

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = query.trim();

    if (!trimmed) {
      setError("Enter a keyword to search for repositories.");
      return;
    }

    setError("");
    setPage(1);

    // Update the search term even if it is the same as before.
    if (trimmed === searchTerm) {
      // Trigger a new request for the same search.
      setRefreshKey((current) => current + 1);
    } else {
      setSearchTerm(trimmed);
    }
  }


  async function saveFavourite() {
    if (!confirmRepo) return;

    const repo = confirmRepo;

    setSavingId(repo.id);
    setFavouriteMessage("");

    try {
      const { data: result } = await axiosInstance.post(ProjectApiList.addFavourite, {
        githubRepoId: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        description: repo.description,
        url: repo.url,
        stars: repo.stars,
        forks: repo.forks,
        language: repo.language,
      });

      setNoticeType("success");
      setFavouriteMessage(`${repo.fullName} added to favourites.`);
      setConfirmRepo(null);
      void result;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      const msg =
        status === 409
          ? "This repository is already in your favourites."
          : ((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Unable to save repository.");
      setNoticeType("error");
      setFavouriteMessage(msg);
      setConfirmRepo(null);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#f7f8fa] text-slate-900">
        <Navbar />

        <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
          <section className="mb-7 flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-2xl font-black text-amber-800 sm:h-[68px] sm:w-[68px] sm:text-3xl">
                JS
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
                  Open-source explorer
                </p>
                <h1 className="mt-0.5 text-xl font-bold tracking-tight sm:mt-1 sm:text-2xl md:text-3xl">
                  Repository Analytics
                </h1>
                <p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-sm">
                  Discover and compare public GitHub repositories.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSearch}
              className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl"
            >
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search repositories</span>
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                  ⌕
                </span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search GitHub repositories..."
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </label>
              <button
                type="submit"
                disabled={!query.trim()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {loading ? "Searching..." : "Search"}
              </button>

            </form>
          </section>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
            <div className="flex items-center gap-5">
              <span className="border-b-2 border-violet-600 px-1 pb-3 text-sm font-semibold text-violet-700">
                Overview
              </span>
              <Link
                href="/favourites"
                className="pb-3 text-sm text-slate-500 transition hover:text-violet-700"
              >
                Saved repositories
              </Link>
            </div>

            <div className="pb-3 text-xs text-slate-500">
              {cached && !loading ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                  Cached results
                </span>
              ) : (
                "Details comming from GitHub REST API"
              )}
            </div>
          </div>

          <section className="mb-7 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  Matching repositories
                </p>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-lg text-violet-600">
                  ◈
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight">
                {loading ? "—" : formatNumber(totalCount)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Results reported by GitHub
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  Stars on this page
                </p>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-lg text-amber-600">
                  ★
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight">
                {loading ? "—" : formatNumber(visibleStars)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Combined stars of visible results
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  Languages
                </p>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-lg text-sky-600">
                  &lt;/&gt;
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight">
                {loading ? "—" : languageCount}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Distinct languages on this page
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  Current page
                </p>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-lg text-emerald-600">
                  ≡
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight">
                {loading ? "—" : page}
                {!loading && totalPages > 0 && (
                  <span className="ml-2 text-base font-medium text-slate-400">
                    / {totalPages}
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Ten repositories per page
              </p>
            </article>
          </section>

          {favouriteMessage && (
            <div
              role={noticeType === "error" ? "alert" : "status"}
              className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${noticeType === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
            >
              <span>{favouriteMessage}</span>
              <button
                type="button"
                onClick={() => setFavouriteMessage("")}
                aria-label="Dismiss notification"
                className="font-semibold opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          )}

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h2 className="font-semibold">Repositories</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {loading
                    ? "Fetching repository data..."
                    : `Showing ${items.length} repositories for "${searchTerm}"`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="repository-sort"
                  className="whitespace-nowrap text-xs font-medium text-slate-500"
                >
                  Sort by
                </label>
                <select
                  id="repository-sort"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value);
                    setPage(1);
                  }}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                >
                  <option value="stars">Most stars</option>
                  <option value="updated">Recently updated</option>
                </select>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {loading ? (
                <RepositorySkeleton />
              ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                  <h3 className="font-semibold text-red-800">
                    Unable to load repositories
                  </h3>
                  <p className="mt-2 text-sm text-red-700">{error}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setPage((current) => current);
                      setSearchTerm("");
                      setTimeout(() => setSearchTerm(searchTerm), 0);
                    }}
                    className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                  >
                    Try again
                  </button>
                </div>
              ) : items.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-500">
                    ⌕
                  </div>
                  <h3 className="mt-4 font-semibold">
                    No repositories found
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Try another keyword or adjust your search.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      {totalCount.toLocaleString()} results reported by GitHub
                    </span>
                    <span>Page {page}</span>
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[800px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                          <th className="px-3 py-3 font-semibold">Repository</th>
                          <th className="px-3 py-3 font-semibold">Activity</th>
                          <th className="px-3 py-3 font-semibold">Stars</th>
                          <th className="px-3 py-3 font-semibold">Forks</th>
                          <th className="px-3 py-3 font-semibold">Language</th>
                          <th className="px-3 py-3 font-semibold">Last updated</th>
                          <th className="px-3 py-3 text-right font-semibold">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((repo) => (
                          <tr
                            key={repo.id}
                            className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/80"
                          >
                            <td className="max-w-[300px] px-3 py-4">
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-xs font-bold text-violet-700">
                                  {initials(repo.fullName)}
                                </div>
                                <div className="min-w-0">
                                  <Link
                                    href={`/repo/${encodeURIComponent(repo.fullName.split("/")[0])}/${encodeURIComponent(repo.name)}`}
                                    className="break-words text-sm font-semibold text-slate-800 hover:text-violet-700"
                                  >
                                    {repo.fullName}
                                  </Link>
                                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                    {repo.description || "No description provided."}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4">
                              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                Public
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                              <span className="text-amber-500">★</span>{" "}
                              {formatNumber(repo.stars)}
                            </td>
                            <td className="px-3 py-4 text-sm text-slate-600">
                              {formatNumber(repo.forks)}
                            </td>
                            <td className="px-3 py-4">
                              {repo.language ? (
                                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                  {repo.language}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-xs text-slate-500">
                              {formatDate(repo.updatedAt)}
                            </td>
                            <td className="px-3 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => setConfirmRepo(repo)}
                                disabled={savingId === repo.id}
                                className="whitespace-nowrap rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-50"
                              >
                                {savingId === repo.id
                                  ? "Saving..."
                                  : "♡ Favourite"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-3 md:hidden">
                    {items.map((repo) => (
                      <article
                        key={repo.id}
                        className="rounded-xl border border-slate-200 p-4 transition hover:border-violet-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xs font-bold text-violet-700">
                            {initials(repo.fullName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/repo/${encodeURIComponent(repo.fullName.split("/")[0])}/${encodeURIComponent(repo.name)}`}
                              className="break-words text-sm font-semibold hover:text-violet-700"
                            >
                              {repo.fullName}
                            </Link>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                              {repo.description || "No description provided."}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                          <span>
                            <span className="text-amber-500">★</span>{" "}
                            {formatNumber(repo.stars)}
                          </span>
                          <span>⑂ {formatNumber(repo.forks)} forks</span>
                          <span>{repo.language || "Unknown language"}</span>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                          <span className="text-xs text-slate-400">
                            Updated {formatDate(repo.updatedAt)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setConfirmRepo(repo)}
                            disabled={savingId === repo.id}
                            className="rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                          >
                            {savingId === repo.id ? "Saving..." : "♡ Favourite"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>

                  <nav
                    aria-label="Repository pagination"
                    className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5"
                  >
                    <p className="text-xs text-slate-500">
                      Page {page}
                      {totalPages > 0 ? ` of ${totalPages}` : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={page <= 1 || loading}
                        onClick={() => setPage((current) => current - 1)}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ← Previous
                      </button>
                      <button
                        type="button"
                        disabled={
                          loading ||
                          page >= totalPages ||
                          page >= 100
                        }
                        onClick={() => setPage((current) => current + 1)}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next →
                      </button>
                    </div>
                  </nav>
                </>
              )}
            </div>
          </section>

          <footer className="py-7 text-center text-xs text-slate-400">
            Repository statistics are supplied by the GitHub REST API.
          </footer>
        </div>

        {confirmRepo && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                savingId === null
              ) {
                setConfirmRepo(null);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="favourite-dialog-title"
              aria-describedby="favourite-dialog-description"
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              {/* <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-2xl text-violet-600">
                ♡
              </div> */}

              <h2
                id="favourite-dialog-title"
                className="mt-4 text-lg font-bold"
              >
                Save to favourites?
              </h2>
              <p
                id="favourite-dialog-description"
                className="mt-2 text-sm leading-6 text-slate-500"
              >
                Add{" "}
                <span className="font-semibold text-slate-800">
                  {confirmRepo.fullName}
                </span>{" "}
                to your saved repositories for quick access later.
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={savingId !== null}
                  onClick={() => setConfirmRepo(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingId !== null}
                  onClick={saveFavourite}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingId !== null && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  {savingId !== null ? "Saving..." : "Yes, save"}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
