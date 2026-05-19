"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarPlus, ChevronDown, Gauge, Home, Images, LogOut, Mail, Menu, UserRound, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const nav = [
  { href: "/photographer/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/photographer/create-event", label: "Create Event", icon: CalendarPlus },
  { href: "/photographer/events", label: "My Events", icon: Images }
];

export function DashboardShell({ children, title }: { children: React.ReactNode; title: string }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const initials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
    : "P";

  const sidebar = (
    <aside className="flex h-full flex-col bg-ink p-5 text-white">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Photo Finder
        </Link>
        <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-white/70 hover:bg-white/10 lg:hidden" aria-label="Close menu">
          <X size={18} />
        </button>
      </div>
      <Link
        href="/"
        onClick={() => setOpen(false)}
        className="mt-5 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
      >
        <Home size={18} />
        Mode Selection
      </Link>
      <nav className="mt-10 space-y-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                active ? "bg-white text-ink shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={logout}
        className="mt-auto flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
      >
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-mist lg:grid lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:block">{sidebar}</div>
        {open && <div className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
        <div className={`fixed inset-y-0 left-0 z-50 w-72 transform transition lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}>
          {sidebar}
        </div>
        <main className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setOpen(true)}
                  className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 transition hover:bg-slate-50 lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu size={20} />
                </button>
                <h1 className="text-lg font-semibold sm:text-xl">{title}</h1>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((current) => !current)}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left shadow-sm transition hover:bg-slate-50"
                  aria-expanded={profileOpen}
                  aria-label="Open profile details"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rosewood/10 text-sm font-bold text-rosewood">
                    {initials}
                  </span>
                  <span className="hidden min-w-0 sm:block">
                    <span className="block max-w-36 truncate text-sm font-semibold text-ink">{user?.name}</span>
                    <span className="block max-w-44 truncate text-xs text-slate-500">{user?.email}</span>
                  </span>
                  <ChevronDown size={16} className={`text-slate-400 transition ${profileOpen ? "rotate-180" : ""}`} />
                </button>

                {profileOpen && (
                  <>
                    <button className="fixed inset-0 z-40 cursor-default" aria-label="Close profile details" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 top-14 z-50 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
                      <div className="border-b border-slate-100 p-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-12 w-12 place-items-center rounded-full bg-rosewood/10 text-base font-bold text-rosewood">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{user?.name}</p>
                            <p className="truncate text-sm text-slate-500">Photographer account</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3 p-4">
                        <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                          <Mail size={17} className="mt-0.5 text-slate-400" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
                            <p className="truncate text-sm font-medium text-slate-700">{user?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                          <UserRound size={17} className="mt-0.5 text-slate-400" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</p>
                            <p className="text-sm font-medium text-slate-700">Photographer</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={logout}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          <LogOut size={17} />
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>
          <div className="page-enter p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
