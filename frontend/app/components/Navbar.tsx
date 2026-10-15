"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      setShowLogoutModal(false);
    } finally {
      setLoggingOut(false);
    }
  }

  function navLink(href: string, label: string) {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={
          active
            ? "rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700"
            : "rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
        }
      >
        {label}
      </Link>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-2 px-4 sm:h-16 sm:gap-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-xs font-bold text-white sm:h-9 sm:w-9 sm:text-sm">
              GH
            </span>
            <span className="text-sm font-bold tracking-tight sm:text-base">
              Repo<span className="text-violet-600">Insights</span>
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex min-w-0 items-center gap-0.5 sm:gap-1">
            {user ? (
              <>
                {navLink("/", "Dashboard")}
                {navLink("/favourites", "Favourites")}
                {/* Show name only on sm+ */}
                <span className="hidden max-w-[120px] truncate px-2 py-2 text-sm text-slate-500 sm:block lg:max-w-[200px]">
                  {user.fullName}
                </span>
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                {navLink("/login", "Login")}
                {navLink("/register", "Register")}
              </>
            )}
          </nav>
        </div>
      </header>

      {showLogoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !loggingOut) setShowLogoutModal(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-xl text-red-600">
              ↪
            </div>
            <h2 id="logout-title" className="mt-4 text-lg font-bold text-slate-900">
              Confirm logout
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Are you sure you want to log out of RepoInsights?
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={loggingOut}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {loggingOut && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {loggingOut ? "Logging out…" : "Yes, logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
