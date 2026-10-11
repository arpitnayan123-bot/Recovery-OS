"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FileText,
  Scale,
  Building2,
  Activity,
  Settings2,
  ArrowUpRight,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Sparkles,
  BarChart3,
  ScrollText,
  Search,
  UserCircle,
} from "lucide-react";
import { Logo } from "@/components/site/logo";
import { CommandPalette } from "./command-palette";
import { NotificationsBell } from "./notifications-bell";
import { ThemeToggle } from "./theme-toggle";
import { ShortcutsHelp } from "./shortcuts-help";
import { useKeyboardNav } from "@/hooks/use-keyboard-nav";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/console", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/console/profile", label: "Profile", icon: UserCircle },
  { href: "/console/invoices", label: "Invoices", icon: FileText },
  { href: "/console/cases", label: "ODR cases", icon: Scale },
  { href: "/console/buyers", label: "Buyers", icon: Building2 },
  { href: "/console/insights", label: "AI insights", icon: Sparkles, badge: "AI" },
  { href: "/console/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/console/activity", label: "Activity", icon: Activity },
  { href: "/console/security", label: "Audit log", icon: ScrollText },
  { href: "/console/settings", label: "Settings", icon: Settings2 },
];

type SessionOrg = {
  id: string;
  name: string;
  gstin: string | null;
  source: string;
  isDemo: boolean;
};

type AuthUser = { id: string; email: string; name: string | null } | null;

export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  useKeyboardNav(true);

  const { data, isLoading } = useQuery<{ org: SessionOrg | null }>({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/session");
      return res.json();
    },
  });

  const { data: authData } = useQuery<{ user: AuthUser }>({
    queryKey: ["auth-me"],
    queryFn: async () => (await fetch("/api/auth/me")).json(),
    staleTime: 60_000,
  });

  const signOut = useMutation({
    mutationFn: async () => {
      await fetch("/api/session", { method: "DELETE" });
      // also revoke the user cookie so a shared machine can't re-enter
      await fetch("/api/auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      qc.clear();
      router.replace("/");
    },
  });

  useEffect(() => {
    if (!isLoading && data && !data.org) {
      router.replace("/onboarding");
    }
  }, [isLoading, data, router]);

  if (isLoading || !data?.org) return <BootSplash />;

  const org = data.org;

  return (
    <div className="min-h-screen lg:pl-60">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card lg:flex">
        <SidebarContent org={org} user={authData?.user ?? null} pathname={pathname} onNavigate={() => {}} onSignOut={() => signOut.mutate()} />
      </aside>

      {/* desktop topbar */}
      <header className="sticky top-0 z-30 hidden h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setPaletteOpen(true)}
            className="group flex w-72 items-center gap-2.5 rounded-lg border border-border bg-card/50 px-3 h-9 text-[12.5px] text-muted-foreground transition-colors hover:border-mint/40 hover:text-mint"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search invoices, buyers, cases…</span>
            <kbd className="ml-auto rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[9px] tracking-[0.06em] text-muted-foreground">⌘K</kbd>
          </button>
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "?", bubbles: true }))}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card/50 text-muted-foreground transition-colors hover:border-mint/40 hover:text-mint"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
          >
            <kbd className="font-mono text-[12px] font-semibold">?</kbd>
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 h-9">
            <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse-dot" />
            <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">engine live</span>
          </div>
          <ThemeToggle />
          <NotificationsBell />
        </div>
      </header>

      {/* mobile topbar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/console" aria-label="Recovery OS console">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationsBell />
          <button
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-card">
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent
              org={org}
              user={authData?.user ?? null}
              pathname={pathname}
              onNavigate={() => setMenuOpen(false)}
              onSignOut={() => {
                setMenuOpen(false);
                signOut.mutate();
              }}
            />
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-10">{children}</main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ShortcutsHelp />
    </div>
  );
}

function SidebarContent({
  org,
  user,
  pathname,
  onNavigate,
  onSignOut,
}: {
  org: SessionOrg;
  user: AuthUser;
  pathname: string;
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  return (
    <>
      <div className="border-b border-border px-5 py-5">
        <Link href="/console" onClick={onNavigate} aria-label="Console home">
          <Logo />
        </Link>
        <div className="mt-5 rounded-lg border border-border bg-card p-3">
          <Link href="/console/profile" onClick={onNavigate} className="block transition-colors hover:text-mint" title={org.name}>
            <p className="truncate font-display text-[13px] font-semibold">{org.name}</p>
            <p className="mt-1 truncate font-mono text-[10px] tracking-[0.1em] text-muted-foreground">
              {org.gstin ?? "GSTIN —"}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              {org.isDemo ? (
                <span className="rounded border border-flare/30 bg-flare/[0.08] px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase text-flare">
                  demo data
                </span>
              ) : null}
              <span className="rounded border border-mint/25 bg-mint/[0.07] px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase text-mint">
                {org.source} sync
              </span>
            </div>
          </Link>
          {user ? (
            <p className="mt-2.5 flex items-center gap-1.5 truncate border-t border-border/60 pt-2 font-mono text-[9.5px] tracking-[0.08em] text-muted-foreground" title={user.email}>
              <span className="h-1 w-1 rounded-full bg-mint" />
              {user.email}
            </p>
          ) : (
            <Link href="/signup" className="mt-2.5 block truncate border-t border-border/60 pt-2 font-mono text-[9.5px] tracking-[0.08em] text-mint/80 transition-colors hover:text-mint">
              create account to keep this workspace →
            </Link>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Console">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-mint/[0.09] text-mint"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-mint" : "text-muted-foreground group-hover:text-foreground")} />
              {item.label}
              {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-mint animate-pulse-dot" /> : null}
              {item.badge ? (
                <span
                  className={cn(
                    "ml-auto rounded border px-1.5 py-0.5 font-mono text-[8.5px] tracking-[0.12em] uppercase",
                    active ? "border-mint/40 bg-mint/10 text-mint" : "border-flare/30 bg-flare/[0.06] text-flare"
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-border px-3 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowUpRight className="h-4 w-4" />
          Back to site
        </Link>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-muted-foreground transition-colors hover:bg-alert/[0.08] hover:text-alert"
        >
          <LogOut className="h-4 w-4" />
          End session
        </button>
        <div className="mt-3 flex items-center gap-2 px-3 pt-2">
          <ShieldCheck className="h-3.5 w-3.5 text-mint" />
          <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-muted-foreground">
            session encrypted
          </span>
        </div>
      </div>
    </>
  );
}

function BootSplash() {
  const [step, setStep] = useState(0);
  const lines = [
    "ESTABLISHING SECURE SESSION",
    "LOADING RECOVERY ENGINE v2.4",
    "MOUNTING STATUTORY CLOCKS",
  ];

  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % (lines.length + 1)), 420);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="animate-pulse-dot">
        <Logo />
      </div>
      <div className="mt-8 w-64 space-y-1.5 font-mono text-[10px] tracking-[0.16em] text-muted-foreground">
        {lines.slice(0, step).map((l) => (
          <p key={l} className="flex items-center gap-2">
            <span className="text-mint">✓</span> {l}
          </p>
        ))}
        {step < lines.length ? (
          <p className="flex items-center gap-2">
            <span className="text-mint animate-blink">▌</span> {lines[step]}
          </p>
        ) : null}
      </div>
    </div>
  );
}
