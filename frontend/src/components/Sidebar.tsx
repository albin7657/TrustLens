"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  LogOut,
  ChevronDown,
  Shield,
  LayoutDashboard,
  Search,
  Brain,
  Network,
  Bot,
  FileWarning,
  ArrowRightLeft,
} from "lucide-react";
import TrustLensLogo from "@/components/TrustLensLogo";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// ── Standard User Navigation (Professional Lucide Icons) ──────────────────────
const USER_MENU_ITEMS = [
  { icon: LayoutDashboard, label: "Home", href: "/overview" },
  { icon: Search, label: "Scan Center", href: "/scan" },
  { icon: Brain, label: "Intelligence", href: "/intelligence" },
  { icon: Network, label: "Trust Graph", href: "/trust-graph" },
  { icon: Bot, label: "RAG Assistant", href: "/rag-assistant" },
  { icon: FileWarning, label: "Reports", href: "/reports" },
];

// ── Admin Navigation (Clean, single entry to Admin Console) ───────────────────
const ADMIN_MENU_ITEMS = [
  { icon: Shield, label: "Admin Console", href: "/admin" },
];

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
      if (cached) {
        setRole(cached);
        return;
      }
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
    } catch {
      /* best-effort */
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch {
      /* ignore */
    }
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
  const isOnAdminPage = pathname.startsWith("/admin");

  // Determine active navigation menu: Admin menu ONLY when actively on /admin
  const menuItems = isAdmin && isOnAdminPage
    ? ADMIN_MENU_ITEMS
    : USER_MENU_ITEMS;

  return (
    <aside
      className={`${
        mobile ? "relative" : "fixed left-0 top-0"
      } z-40 h-screen w-64 border-r border-slate-800/80 bg-slate-950/95 backdrop-blur-2xl ${
        mobile ? "block" : "hidden lg:block"
      }`}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="border-b border-slate-800/80 p-5">
          <Link href="/overview" className="group block">
            <TrustLensLogo size="sm" />
          </Link>
        </div>

        {/* Section Header */}
        <div className="px-4 pt-4 pb-1 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {isOnAdminPage ? "Admin Workspace" : "Main Navigation"}
          </span>
          {isAdmin && (
            <span className="rounded-md bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-400">
              ADMIN
            </span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href ||
                    (item.href !== "/overview" &&
                      pathname.startsWith(`${item.href}/`)) ||
                    (item.href === "/scan" &&
                      [
                        "/job-scanner",
                        "/communication-analyzer",
                        "/recruiter-verification",
                        "/company-verification",
                      ].includes(pathname)) ||
                    (item.href === "/intelligence" &&
                      pathname === "/trust-repository") ||
                    (item.href === "/reports" &&
                      [
                        "/community-reports",
                        "/reporting-assistant",
                      ].includes(pathname));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-150 ${
                      isActive
                        ? "bg-gradient-to-r from-cyan-500/20 to-blue-600/10 border border-cyan-500/30 text-cyan-300 font-semibold shadow-sm shadow-cyan-950/40"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Quick link for Admins to switch between Admin Console and User Scanner View */}
          {isAdmin && (
            <div className="mt-4 pt-3 border-t border-slate-800/60">
              <Link
                href={isOnAdminPage ? "/overview" : "/admin"}
                className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs font-medium text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-colors"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">
                  {isOnAdminPage ? "Switch to User Portal" : "Open Admin Console"}
                </span>
              </Link>
            </div>
          )}
        </nav>

        {/* User Profile Bar */}
        <div className="border-t border-slate-800/80 p-3">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex w-full items-center gap-3 rounded-xl bg-slate-900/60 px-3.5 py-2.5 transition hover:bg-slate-800/80 border border-slate-800/60"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-bold text-white shadow-lg shadow-cyan-900/40">
                {initials}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="truncate text-sm font-semibold text-slate-100">
                  {displayName}
                </p>
                <p className="truncate text-xs text-slate-500 font-mono">
                  {displayEmail}
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                  showUserMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
                {isAdmin && (
                  <div className="flex items-center gap-2 border-b border-slate-800/80 px-4 py-2 bg-cyan-950/20">
                    <Shield className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-xs font-medium text-cyan-400">
                      System Administrator
                    </span>
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-400 transition hover:bg-slate-800/60 hover:text-red-400 disabled:opacity-50"
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
