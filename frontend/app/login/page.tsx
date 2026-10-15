"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

async function handleSubmit(
  event: React.FormEvent<HTMLFormElement>
) {
  event.preventDefault();
  event.stopPropagation();

  if (submitting) return;

  setError("");

  if (!email.trim() || !password) {
    setError("Email and password are required.");
    return;
  }

  setSubmitting(true);

  try {
    const response = await axiosInstance.post(
      ProjectApiList.login,
      {
        email: email.trim(),
        password,
      }
    );

    const data = response.data;

    // Stop here when the API reports unsuccessful login.
    if (data?.success !== true) {
      setError(data?.message || "Login failed.");
      return;
    }

    // Do not update authentication state without valid data.
    if (!data.user || !data.token) {
      setError("The server returned an invalid login response.");
      return;
    }

    login(data.user, data.token);
    router.replace("/");
  } catch (err: unknown) {
    const axiosError = err as {
      response?: {
        data?: {
          message?: string;
        };
      };
      message?: string;
    };

    setError(
      axiosError.response?.data?.message ||
        "Login failed. Please try again."
    );
  } finally {
    setSubmitting(false);
  }
}

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa]">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center sm:mb-8">
          <Link href="/" className="inline-flex items-center gap-2 sm:gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-xs font-bold text-white sm:h-10 sm:w-10 sm:text-sm">
              GH
            </span>
            <span className="text-lg font-bold tracking-tight sm:text-xl">
              Repo<span className="text-violet-600">Insights</span>
            </span>
          </Link>
          <h1 className="mt-5 text-xl font-bold text-slate-900 sm:mt-6 sm:text-2xl">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your account</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {error && (
            <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-800"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-violet-700 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
