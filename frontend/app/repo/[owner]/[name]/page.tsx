
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Repository = {
    id: number;
    name: string;
    fullName: string;
    description: string | null;
    url: string;
    homepage: string | null;
    stars: number;
    forks: number;
    language: string | null;
    defaultBranch: string;
    createdAt: string;
    updatedAt: string;
};

type Commit = {
    sha: string;
    message: string;
    author: string;
    date: string | null;
    url: string;
};

type Contributor = {
    id: number;
    username: string;
    avatar: string;
    profileUrl: string;
    contributions: number;
};

type RepositoryResponse = {
    success: boolean;
    repository: Repository;
    commits: Commit[];
    contributors: Contributor[];
    openIssuesCount: number;
    message?: string;
};

type ConfirmationAction = "save" | "remove";

function numberFormat(value: number) {
    return new Intl.NumberFormat("en", {
        notation: value >= 100000 ? "compact" : "standard",
        maximumFractionDigits: 1,
    }).format(value);
}

function dateFormat(value: string | null | undefined) {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function timeAgo(value: string | null | undefined) {
    if (!value) return "Date unavailable";

    const timestamp = new Date(value).getTime();

    if (Number.isNaN(timestamp)) return "Date unavailable";

    const days = Math.floor(
        (Date.now() - timestamp) / (1000 * 60 * 60 * 24)
    );

    if (days < 0) return "Recently";
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;

    return `${Math.floor(days / 365)} years ago`;
}

function getInitials(value: string) {
    return value
        .split("/")
        .pop()
        ?.slice(0, 2)
        .toUpperCase() || "GH";
}

function LoadingPage() {
    return (
        <main className="min-h-screen animate-pulse bg-[#f7f8fa] px-4 py-8 sm:px-8">
            <div className="mx-auto max-w-[1440px]">
                <div className="h-4 w-36 rounded bg-slate-200" />
                <div className="mt-8 h-24 rounded-2xl bg-white" />
                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-32 rounded-xl bg-white" />
                    ))}
                </div>
                <div className="mt-6 grid gap-5 xl:grid-cols-3">
                    <div className="h-72 rounded-xl bg-white xl:col-span-2" />
                    <div className="h-72 rounded-xl bg-white" />
                </div>
            </div>
        </main>
    );
}

function StatCard({
    label,
    value,
    subtitle,
    icon,
    color,
}: {
    label: string;
    value: string;
    subtitle: string;
    icon: string;
    color: string;
}) {
    return (
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${color}`}
                >
                    {icon}
                </span>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                {value}
            </p>
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </article>
    );
}

export default function RepositoryDetailsPage() {
    const params = useParams<{ owner: string; name: string }>();

    const owner = params.owner;
    const name = params.name;

    const [data, setData] = useState<RepositoryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isFavourite, setIsFavourite] = useState(false);
    const [favouriteStatusLoading, setFavouriteStatusLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmation, setConfirmation] =
        useState<ConfirmationAction | null>(null);
    const [notice, setNotice] = useState("");
    const [noticeError, setNoticeError] = useState(false);

    const [favouritesCount, setFavouritesCount] = useState(0);


    const loadFavouritesCount = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api/favourites`);
            const result = await response.json();

            if (response.ok && result.success && Array.isArray(result.data)) {
                setFavouritesCount(result.data.length);
            }
        } catch (error) {
            console.error("Unable to load favourites count:", error);
        }
    }, []);

    useEffect(() => {
        loadFavouritesCount();
    }, [loadFavouritesCount]);

    const loadRepository = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError("");
        setNotice("");

        try {
            const response = await fetch(
                `${API_URL}/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
                { signal }
            );

            const result: RepositoryResponse = await response.json();

            if (!response.ok || !result.success) {
                if (response.status === 429) {
                    throw new Error(
                        "GitHub rate limit reached. Please wait before trying again."
                    );
                }

                if (response.status === 404) {
                    throw new Error(
                        "This repository was not found or is no longer accessible."
                    );
                }

                if (response.status === 504) {
                    throw new Error("GitHub took too long to respond. Try again.");
                }

                throw new Error(result.message || "Unable to load repository.");
            }

            setData(result);

            // Check whether this repository is already saved.
            try {
                setFavouriteStatusLoading(true);

                const favouriteResponse = await fetch(
                    `${API_URL}/api/favourites/${result.repository.id}`,
                    { signal }
                );

                if (favouriteResponse.ok) {
                    const favouriteResult = await favouriteResponse.json();
                    setIsFavourite(Boolean(favouriteResult.isFavourite));
                }
            } catch (favouriteError) {
                if (
                    favouriteError instanceof Error &&
                    favouriteError.name === "AbortError"
                ) {
                    return;
                }
                // Repository details remain usable if favourite status fails.
            } finally {
                setFavouriteStatusLoading(false);
            }
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;

            setError(
                err instanceof Error ? err.message : "Something went wrong."
            );
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [owner, name]);

    useEffect(() => {
        const controller = new AbortController();

        loadRepository(controller.signal);

        return () => controller.abort();
    }, [loadRepository]);

    const contributors = data?.contributors ?? [];
    const commits = data?.commits ?? [];

    const totalContributions = useMemo(
        () =>
            contributors.reduce(
                (total, contributor) => total + contributor.contributions,
                0
            ),
        [contributors]
    );

    const maxContributions = useMemo(
        () =>
            Math.max(
                1,
                ...contributors.map((contributor) => contributor.contributions)
            ),
        [contributors]
    );

    async function performFavouriteAction() {
        if (!data || !confirmation) return;

        const action = confirmation;
        const repository = data.repository;

        setActionLoading(true);
        setNotice("");

        try {
            let response: Response;

            if (action === "save") {
                response = await fetch(`${API_URL}/api/favourites`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        githubRepoId: repository.id,
                        name: repository.name,
                        fullName: repository.fullName,
                        description: repository.description,
                        url: repository.url,
                        stars: repository.stars,
                        forks: repository.forks,
                        language: repository.language,
                    }),
                });
            } else {
                response = await fetch(
                    `${API_URL}/api/favourites/${repository.id}`,
                    { method: "DELETE" }
                );
            }

            const result = await response.json();

            if (!response.ok || !result.success) {
                if (action === "save" && response.status === 409) {
                    setIsFavourite(true);
                    throw new Error("This repository is already in your favourites.");
                }

                throw new Error(
                    result.message ||
                    (action === "save"
                        ? "Unable to save this repository."
                        : "Unable to remove this repository.")
                );
            }

            setIsFavourite(action === "save");
            setNotice(
                action === "save"
                    ? "Repository saved to your favourites."
                    : "Repository removed from your favourites."
            );
            setNoticeError(false);
            setConfirmation(null);
        } catch (err) {
            setNotice(
                err instanceof Error ? err.message : "The action could not be completed."
            );
            setNoticeError(true);
            setConfirmation(null);
        } finally {
            setActionLoading(false);
        }
    }

    if (loading && !data) return <LoadingPage />;

    if (error && !data) {
        return (
            <main className="min-h-screen bg-[#f7f8fa] px-4 py-12 sm:px-8">
                <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-xl text-red-600">
                        !
                    </div>
                    <h1 className="mt-4 text-xl font-bold text-slate-900">
                        Unable to load repository
                    </h1>
                    <p role="alert" className="mt-2 text-sm leading-6 text-slate-600">
                        {error}
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => loadRepository()}
                            className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
                        >
                            Try again
                        </button>
                        <Link
                            href="/"
                            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Back to dashboard
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    if (!data) return null;

    const repository = data.repository;

    return (
        <main className="min-h-screen bg-[#f7f8fa] text-slate-900">
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                    <Link href="/" className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-sm font-bold text-white">
                            GH
                        </span>
                        <span className="text-base font-bold tracking-tight">
                            Repo<span className="text-violet-600">Insights</span>
                        </span>
                    </Link>

                    <nav className="flex items-center gap-2 text-sm">
                        <Link
                            href="/"
                            className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100"
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/favourites"
                            className="rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100"
                        >
                            Favourites
                        </Link>
                    </nav>
                </div>
            </header>

            <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-violet-700"
                >
                    ← Back to repositories
                </Link>

                <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-lg font-bold text-violet-700">
                                {getInitials(repository.fullName)}
                            </div>

                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="break-words text-xl font-bold tracking-tight sm:text-3xl">
                                        {repository.fullName}
                                    </h1>
                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                        Public
                                    </span>
                                </div>

                                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                                    {repository.description || "No description provided for this repository."}
                                </p>

                                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                                    {repository.language && (
                                        <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700">
                                            {repository.language}
                                        </span>
                                    )}
                                    <span className="rounded-full bg-slate-100 px-3 py-1.5">
                                        Default branch: {repository.defaultBranch || "Unknown"}
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-3 py-1.5">
                                        Created {dateFormat(repository.createdAt)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                            <a
                                href={repository.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                View on GitHub ↗
                            </a>

                            <button
                                type="button"
                                disabled={favouriteStatusLoading || actionLoading}
                                onClick={() =>
                                    setConfirmation(isFavourite ? "remove" : "save")
                                }
                                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${isFavourite
                                    ? "border border-red-200 text-red-600 hover:bg-red-50"
                                    : "bg-violet-600 text-white hover:bg-violet-700"
                                    }`}
                            >
                                {favouriteStatusLoading ? (
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                                ) : null}
                                {favouriteStatusLoading
                                    ? "Checking..."
                                    : isFavourite
                                        ? "♥ Remove favourite"
                                        : "♡ Add favourite"}
                            </button>
                        </div>
                    </div>
                </section>

                {notice && (
                    <div
                        role={noticeError ? "alert" : "status"}
                        className={`mt-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${noticeError
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                    >
                        <span>{notice}</span>
                        <button
                            type="button"
                            onClick={() => setNotice("")}
                            aria-label="Dismiss notification"
                            className="font-semibold"
                        >
                            ✕
                        </button>
                    </div>
                )}

                <div className="mb-6 mt-6 flex items-center gap-5 border-b border-slate-200">
                    <span className="border-b-2 border-violet-600 px-1 pb-3 text-sm font-semibold text-violet-700">
                        Overview
                    </span>
                    <a
                        href="#contributors"
                        className="pb-3 text-sm text-slate-500 hover:text-violet-700"
                    >
                        Contributors
                    </a>
                    <a
                        href="#commits"
                        className="pb-3 text-sm text-slate-500 hover:text-violet-700"
                    >
                        Commits
                    </a>
                </div>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Stars"
                        value={numberFormat(repository.stars)}
                        subtitle="Total repository stars"
                        icon="★"
                        color="bg-amber-50 text-amber-600"
                    />
                    <StatCard
                        label="Forks"
                        value={numberFormat(repository.forks)}
                        subtitle="Repository forks"
                        icon="⑂"
                        color="bg-violet-50 text-violet-600"
                    />
                    <StatCard
                        label="Open issues"
                        value={numberFormat(data.openIssuesCount)}
                        subtitle="Currently open issues"
                        icon="◉"
                        color="bg-sky-50 text-sky-600"
                    />
                    <StatCard
                        label="Contributors shown"
                        value={String(contributors.length)}
                        subtitle="Top contributors returned by GitHub"
                        icon="♙"
                        color="bg-emerald-50 text-emerald-600"
                    />
                </section>

                <section className="mt-6 grid gap-5 xl:grid-cols-3">
                    <article
                        id="contributors"
                        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 className="font-semibold">Top contributors</h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Contribution counts returned by GitHub
                                </p>
                            </div>
                            <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">
                                {contributors.length} contributors
                            </span>
                        </div>

                        {contributors.length === 0 ? (
                            <div className="py-12 text-center text-sm text-slate-500">
                                No contributor data is available for this repository.
                            </div>
                        ) : (
                            <>
                                <div className="mt-7 flex h-48 items-end gap-3 border-b border-l border-slate-200 px-2 pb-2 sm:gap-5 sm:px-5">
                                    {contributors.map((contributor) => {
                                        const height = Math.max(
                                            5,
                                            (contributor.contributions / maxContributions) * 100
                                        );

                                        return (
                                            <div
                                                key={contributor.id}
                                                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                                                title={`${contributor.username}: ${contributor.contributions} contributions`}
                                            >
                                                <span className="text-[10px] font-semibold text-slate-500 sm:text-xs">
                                                    {numberFormat(contributor.contributions)}
                                                </span>
                                                <div
                                                    className="w-full max-w-12 rounded-t-md bg-violet-500 transition-all hover:bg-violet-700"
                                                    style={{ height: `${height}%` }}
                                                />
                                                <span className="w-full truncate text-center text-[10px] text-slate-500">
                                                    {contributor.username}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                <p className="mt-4 text-xs text-slate-400">
                                    {numberFormat(totalContributions)} total contributions across
                                    the displayed contributors. This is not a complete repository
                                    activity history.
                                </p>
                            </>
                        )}
                    </article>

                    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="font-semibold">Repository overview</h2>
                        <p className="mt-1 text-xs text-slate-500">
                            Key repository information
                        </p>

                        <dl className="mt-6 space-y-5">
                            <div className="flex items-start justify-between gap-4">
                                <dt className="text-sm text-slate-500">Primary language</dt>
                                <dd className="text-right text-sm font-semibold">
                                    {repository.language || "Not specified"}
                                </dd>
                            </div>
                            <div className="flex items-start justify-between gap-4">
                                <dt className="text-sm text-slate-500">Default branch</dt>
                                <dd className="max-w-[60%] break-words text-right text-sm font-semibold">
                                    {repository.defaultBranch || "Unknown"}
                                </dd>
                            </div>
                            <div className="flex items-start justify-between gap-4">
                                <dt className="text-sm text-slate-500">Created</dt>
                                <dd className="text-right text-sm font-semibold">
                                    {dateFormat(repository.createdAt)}
                                </dd>
                            </div>
                            <div className="flex items-start justify-between gap-4">
                                <dt className="text-sm text-slate-500">Last updated</dt>
                                <dd className="text-right text-sm font-semibold">
                                    {timeAgo(repository.updatedAt)}
                                </dd>
                            </div>
                            {repository.homepage && (
                                <div className="flex items-start justify-between gap-4">
                                    <dt className="text-sm text-slate-500">Homepage</dt>
                                    <dd className="max-w-[60%] break-all text-right text-sm font-semibold text-violet-700">
                                        <a
                                            href={repository.homepage}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="hover:underline"
                                        >
                                            Visit site ↗
                                        </a>
                                    </dd>
                                </div>
                            )}
                        </dl>

                        <div className="mt-7 rounded-xl bg-slate-50 p-4">
                            <p className="text-xs font-medium text-slate-500">
                                Quick summary
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-700">
                                {repository.fullName} has{" "}
                                <strong>{numberFormat(repository.stars)}</strong> stars and{" "}
                                <strong>{numberFormat(repository.forks)}</strong> forks, with{" "}
                                <strong>{numberFormat(data.openIssuesCount)}</strong> open
                                issues reported by GitHub.
                            </p>
                        </div>
                    </article>
                </section>

                <section
                    id="commits"
                    className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 sm:p-6">
                        <div>
                            <h2 className="font-semibold">Latest commits</h2>
                            <p className="mt-1 text-xs text-slate-500">
                                The five most recent commits returned by GitHub
                            </p>
                        </div>
                        <a
                            href={`${repository.url}/commits/${encodeURIComponent(repository.defaultBranch || "HEAD")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-violet-700 hover:underline"
                        >
                            View all commits ↗
                        </a>
                    </div>

                    {commits.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">
                            No commits are available for this repository.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {commits.map((commit) => (
                                <article
                                    key={commit.sha}
                                    className="flex gap-3 p-5 transition hover:bg-slate-50/70 sm:gap-4 sm:px-6"
                                >
                                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                                        ↗
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <a
                                            href={commit.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="line-clamp-2 break-words text-sm font-semibold text-slate-800 hover:text-violet-700"
                                        >
                                            {commit.message.split("\n")[0] || "Commit"}
                                        </a>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                            <span>{commit.author}</span>
                                            <span>•</span>
                                            <span>{dateFormat(commit.date)}</span>
                                        </div>
                                    </div>
                                    <a
                                        href={commit.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="shrink-0 self-center rounded-md border border-slate-200 px-2 py-1.5 font-mono text-[10px] text-slate-500 hover:border-violet-200 hover:text-violet-700"
                                        title={commit.sha}
                                    >
                                        {commit.sha.slice(0, 7)}
                                    </a>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="font-semibold">Contributor directory</h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Top five contributors provided by GitHub
                            </p>
                        </div>
                        <span className="text-xs text-slate-400">
                            {contributors.length} shown
                        </span>
                    </div>

                    {contributors.length === 0 ? (
                        <p className="py-8 text-sm text-slate-500">
                            No contributors are available.
                        </p>
                    ) : (
                        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                            {contributors.map((contributor) => (
                                <a
                                    key={contributor.id}
                                    href={contributor.profileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-violet-200 hover:bg-violet-50/40"
                                >
                                    <img
                                        src={contributor.avatar}
                                        alt={`${contributor.username} avatar`}
                                        className="h-10 w-10 rounded-full border border-slate-200 bg-slate-100"
                                        loading="lazy"
                                    />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-800">
                                            {contributor.username}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {numberFormat(contributor.contributions)} contributions
                                        </p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </section>

                <footer className="py-7 text-center text-xs text-slate-400">
                    Repository metrics are provided by the GitHub REST API.
                </footer>
            </div>

            {confirmation && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
                    onMouseDown={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            !actionLoading
                        ) {
                            setConfirmation(null);
                        }
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="favourite-confirm-title"
                        aria-describedby="favourite-confirm-description"
                        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
                    >
                        <div
                            className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${confirmation === "remove"
                                ? "bg-red-50 text-red-600"
                                : "bg-violet-50 text-violet-600"
                                }`}
                        >
                            {confirmation === "remove" ? "♥" : "♡"}
                        </div>

                        <h2
                            id="favourite-confirm-title"
                            className="mt-4 text-lg font-bold"
                        >
                            {confirmation === "remove"
                                ? "Remove favourite?"
                                : "Save to favourites?"}
                        </h2>

                        <p
                            id="favourite-confirm-description"
                            className="mt-2 text-sm leading-6 text-slate-500"
                        >
                            {confirmation === "remove"
                                ? `Remove ${repository.fullName} from your saved repositories?`
                                : `Add ${repository.fullName} to your saved repositories for quick access later?`}
                        </p>

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => setConfirmation(null)}
                                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={performFavouriteAction}
                                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${confirmation === "remove"
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-violet-600 hover:bg-violet-700"
                                    }`}
                            >
                                {actionLoading && (
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                )}
                                {actionLoading
                                    ? confirmation === "remove"
                                        ? "Removing..."
                                        : "Saving..."
                                    : confirmation === "remove"
                                        ? "Yes, remove"
                                        : "Yes, save"}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </main>
    );
}
