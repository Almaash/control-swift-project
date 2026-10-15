
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import AuthGuard from "@/components/auth/AuthGuard";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

type Favourite = {
  _id: string;
  githubRepoId: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  savedAt: string;
};

function formatDate(date: string) {
  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime())
    ? "Unknown date"
    : parsed.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function getInitials(name: string) {
  return name
    .split("/")
    .pop()
    ?.slice(0, 2)
    .toUpperCase() || "RI";
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading favourites">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-slate-200 bg-white p-5"
        >
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-slate-100" />
              <div className="h-3 w-2/3 rounded bg-slate-100" />
            </div>
            <div className="h-9 w-20 rounded-lg bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FavouritesPage() {
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [confirmRepo, setConfirmRepo] = useState<Favourite | null>(null);
  const [message, setMessage] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">(
    "success"
  );

  const loadFavourites = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data: result } = await axiosInstance.get(ProjectApiList.getFavourites);
      setFavourites(Array.isArray(result.data) ? result.data : []);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Unable to load favourites."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavourites();
  }, [loadFavourites]);

  const filteredFavourites = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return favourites;

    return favourites.filter(
      (repo) =>
        repo.fullName.toLowerCase().includes(term) ||
        (repo.description || "").toLowerCase().includes(term) ||
        (repo.language || "").toLowerCase().includes(term)
    );
  }, [favourites, search]);

  const totalStars = useMemo(
    () => favourites.reduce((total, repo) => total + repo.stars, 0),
    [favourites]
  );

  const totalForks = useMemo(
    () => favourites.reduce((total, repo) => total + repo.forks, 0),
    [favourites]
  );

  async function removeFavourite() {
    if (!confirmRepo) return;

    const repo = confirmRepo;
    setRemovingId(repo.githubRepoId);
    setMessage("");
    setError("");

    try {
      await axiosInstance.delete(`${ProjectApiList.removeFavourite}/${repo.githubRepoId}`);

      setFavourites((current) =>
        current.filter((item) => item.githubRepoId !== repo.githubRepoId)
      );
      setConfirmRepo(null);
      setNoticeType("success");
      setMessage(`${repo.fullName} was removed from your favourites.`);
    } catch (err: unknown) {
      setNoticeType("error");
      setMessage(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Unable to remove repository."
      );
      setConfirmRepo(null);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <AuthGuard>
    <main className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <Navbar />

      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              Your collection
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Favourite repositories
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Keep your favourite open-source projects in one place and
              explore their repository analytics.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 sm:self-auto"
          >
            <span aria-hidden="true">+</span>
            Explore repositories
          </Link>
        </div>

        {message && (
          <div
            role={noticeType === "error" ? "alert" : "status"}
            className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
              noticeType === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage("")}
              aria-label="Dismiss notification"
              className="font-semibold opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Saved repositories
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-lg text-violet-600">
                ♡
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight">
              {loading ? "—" : favourites.length.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Your saved GitHub projects
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Combined stars
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-lg text-amber-600">
                ★
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight">
              {loading ? "—" : totalStars.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Stars across saved repositories
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Combined forks
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-lg text-sky-600">
                ⑂
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight">
              {loading ? "—" : totalForks.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Forks across saved repositories
            </p>
          </article>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="font-semibold">Your saved projects</h2>
              <p className="mt-1 text-xs text-slate-500">
                {loading
                  ? "Loading your collection..."
                  : `${filteredFavourites.length} of ${favourites.length} repositories`}
              </p>
            </div>

            <label className="relative block w-full sm:max-w-xs">
              <span className="sr-only">Search favourites</span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                ⌕
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search repositories..."
                disabled={loading || favourites.length === 0}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
              />
            </label>
          </div>

          <div className="p-4 sm:p-5">
            {loading ? (
              <LoadingSkeleton />
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                <p className="font-semibold text-red-800">
                  Could not load your favourites
                </p>
                <p className="mt-2 text-sm text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={loadFavourites}
                  className="mt-4 inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100"
                >
                  Try again
                </button>
              </div>
            ) : favourites.length === 0 ? (
              <div className="px-4 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-3xl text-violet-600">
                  ♡
                </div>
                <h3 className="mt-4 text-lg font-semibold">
                  No favourites yet
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Save repositories from the dashboard and they will appear
                  here for quick access.
                </p>
                <Link
                  href="/"
                  className="mt-5 inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                >
                  Discover repositories
                </Link>
              </div>
            ) : filteredFavourites.length === 0 ? (
              <div className="py-12 text-center">
                <p className="font-medium">No matching repositories</p>
                <p className="mt-2 text-sm text-slate-500">
                  Try a different name, description or language.
                </p>
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-3 text-sm font-semibold text-violet-700 hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[760px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-3 font-semibold">Repository</th>
                        <th className="px-3 py-3 font-semibold">Language</th>
                        <th className="px-3 py-3 font-semibold">Stars</th>
                        <th className="px-3 py-3 font-semibold">Forks</th>
                        <th className="px-3 py-3 font-semibold">Saved</th>
                        <th className="px-3 py-3 text-right font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFavourites.map((repo) => (
                        <tr
                          key={repo.githubRepoId}
                          className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/80"
                        >
                          <td className="max-w-[340px] px-3 py-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-xs font-bold text-violet-700">
                                {getInitials(repo.fullName)}
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
                            {repo.language ? (
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                {repo.language}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-4 text-sm text-slate-600">
                            <span className="text-amber-500">★</span>{" "}
                            {repo.stars.toLocaleString()}
                          </td>
                          <td className="px-3 py-4 text-sm text-slate-600">
                            {repo.forks.toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-xs text-slate-500">
                            {formatDate(repo.savedAt)}
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={repo.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                              >
                                GitHub ↗
                              </a>
                              <button
                                type="button"
                                onClick={() => setConfirmRepo(repo)}
                                disabled={removingId === repo.githubRepoId}
                                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {removingId === repo.githubRepoId
                                  ? "Removing..."
                                  : "Remove"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 md:hidden">
                  {filteredFavourites.map((repo) => (
                    <article
                      key={repo.githubRepoId}
                      className="rounded-xl border border-slate-200 p-4 transition hover:border-violet-200"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xs font-bold text-violet-700">
                          {getInitials(repo.fullName)}
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

                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                        <span>
                          <span className="text-amber-500">★</span>{" "}
                          {repo.stars.toLocaleString()}
                        </span>
                        <span>⑂ {repo.forks.toLocaleString()} forks</span>
                        <span>{repo.language || "Unknown language"}</span>
                      </div>

                      <p className="mt-3 text-xs text-slate-400">
                        Saved {formatDate(repo.savedAt)}
                      </p>

                      <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Open on GitHub ↗
                        </a>
                        <button
                          type="button"
                          onClick={() => setConfirmRepo(repo)}
                          disabled={removingId === repo.githubRepoId}
                          className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {removingId === repo.githubRepoId
                            ? "Removing..."
                            : "Remove favourite"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <p className="mt-5 text-center text-xs text-slate-400">
          Repository statistics reflect the data saved when each favourite was added.
        </p>
      </div>

      {confirmRepo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              removingId === null
            ) {
              setConfirmRepo(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-dialog-title"
            aria-describedby="remove-dialog-description"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            {/* <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-xl text-red-600">
              !
            </div> */}

            <h2
              id="remove-dialog-title"
              className="mt-4 text-lg font-bold text-slate-900"
            >
              Remove favourite?
            </h2>

            <p
              id="remove-dialog-description"
              className="mt-2 text-sm leading-6 text-slate-500"
            >
              Are you sure you want to remove{" "}
              <span className="font-semibold text-slate-800">
                {confirmRepo.fullName}
              </span>{" "}
              from your saved repositories? This will not delete the repository
              from GitHub.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={removingId !== null}
                onClick={() => setConfirmRepo(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removingId !== null}
                onClick={removeFavourite}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {removingId !== null && (
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    aria-hidden="true"
                  />
                )}
                {removingId !== null ? "Removing..." : "Yes, remove"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
    </AuthGuard>
  );
}
