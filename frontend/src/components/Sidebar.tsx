"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { LogOut, ChevronDown, ShieldCheck, Shield } from "lucide-react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// ── 5-item consolidated nav (P2-10) ──────────────────────────────────────────
const MENU_ITEMS = [
  { icon: "🏠", label: "Home", href: "/overview" },
  { icon: "🔎", label: "Scan Center", href: "/scan" },
  { icon: "🧠", label: "Intelligence", href: "/intelligence" },
  { icon: "🚨", label: "Reports", href: "/reports" },
];

const ADMIN_ITEM = { icon: "⚙️", label: "Admin", href: "/admin" };


interface UserData {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

export default function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [role, setRole] = useState<string>("user");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ── Resolve user + role from localStorage / backend ───────────────────────
  const resolveRole = useCallback(async () => {
    try {
      const cached = localStorage.getItem("user_role");
      if (cached) { setRole(cached); return; }
      const token = localStorage.getItem("access_token");
      if (!token) return;
      const res = await fetch(`${BACKEND_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const r = data.role ?? "user";
        setRole(r);
        localStorage.setItem("user_role", r);
      }
    } catch { /* best-effort */ }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch { /* ignore */ }
    resolveRole();
  }, [resolveRole]);

  // ── Sign out ───────────────────────────────────────────────────────────────
  async function handleSignOut() {
    setIsLoggingOut(true);
    try {
      const token = localStorage.getItem("access_token");
      if (token) {
        await fetch(`${BACKEND_URL}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      localStorage.removeItem("user_role");
      setIsLoggingOut(false);
      router.push("/login");
    }
  }

  const displayName = user?.full_name || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || "Not signed in";
  const initials = displayName.slice(0, 2).toUpperCase();
  const isAdmin = role === "admin";

  const allItems = isAdmin ? [...MENU_ITEMS, ADMIN_ITEM] : MENU_ITEMS;

  return (
    <aside
      className={`${mobile ? 'relative' : 'fixed left-0 top-0'} z-40 h-screen w-64 border-r border-slate-200 bg-white/95 backdrop-blur-xl ${mobile ? 'block' : 'hidden lg:block'}`}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="border-b border-slate-200 p-5">
          <Link href="/overview" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-slate-900">TrustLens</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-slate-500">
                Control center
              </p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {allItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`) ||
                (item.href === '/scan' &&
                  ['/job-scanner', '/communication-analyzer', '/recruiter-verification', '/company-verification'].includes(
                    pathname,
                  )) ||
                (item.href === '/intelligence' && pathname === '/trust-repository') ||
                (item.href === '/reports' &&
                  ['/community-reports', '/reporting-assistant'].includes(pathname));
              const isAdminItem = item.href === "/admin";
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-150 ${
                      isActive
                        ? isAdminItem
                          ? "bg-slate-900 text-white font-semibold"
                          : "bg-slate-100 text-slate-900 font-semibold"
                        : isAdminItem
                          ? "text-slate-500 hover:bg-slate-900 hover:text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                    {isAdminItem && (
                      <Shield className="ml-auto h-3 w-3 opacity-60" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User menu */}
        <div className="border-t border-slate-200 p-3">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex w-full items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-3 transition hover:bg-slate-100"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700">
                {initials}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                <p className="truncate text-xs text-slate-400">{displayEmail}</p>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${showUserMenu ? "rotate-180" : ""}`}
              />
            </button>

            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {isAdmin && (
                  <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
                    <Shield className="h-3 w-3 text-indigo-500" />
                    <span className="text-xs font-medium text-indigo-600">Admin</span>
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
