"use client";

import {
  Activity, BarChart3, BookOpen, Dumbbell, LayoutDashboard, LogOut,
  Menu, MessageSquare, Users, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Initials } from "@/components/ui";

const links = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/rutinas", label: "Rutinas", icon: Dumbbell },
  { href: "/catalogo", label: "Catálogo", icon: BookOpen },
  { href: "/progreso", label: "Progreso", icon: BarChart3 },
  { href: "/sesiones", label: "Sesiones", icon: Activity },
  { href: "/chat", label: "Chat", icon: MessageSquare },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { profile, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && profile?.rol !== "entrenador") router.replace("/login");
  }, [loading, profile, router]);

  if (loading || profile?.rol !== "entrenador") {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  const fullName = `${profile.nombre ?? ""} ${profile.apellido ?? ""}`.trim();

  return (
    <div className="shell">
      {open ? <div className="modal-backdrop" style={{ zIndex: 25 }} onClick={() => setOpen(false)} /> : null}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark"><Dumbbell size={20} /></span>
          DiegoApp Coach
          <button className="btn btn-secondary btn-icon mobile-menu" onClick={() => setOpen(false)} style={{ marginLeft: "auto" }}><X size={17} /></button>
        </div>
        <nav className="nav">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} className={`nav-link ${active ? "active" : ""}`} onClick={() => setOpen(false)}><Icon size={18} />{label}</Link>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-link" style={{ width: "100%", border: 0, cursor: "pointer" }} onClick={async () => { await logout(); router.replace("/login"); }}>
            <LogOut size={18} /> Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button className="btn btn-secondary btn-icon mobile-menu" onClick={() => setOpen(true)}><Menu size={19} /></button>
          <span className="dim">Panel del entrenador</span>
          <div className="profile">
            <div className="profile-copy" style={{ textAlign: "right" }}><strong style={{ display: "block", fontSize: 13 }}>{fullName}</strong><span className="dim" style={{ fontSize: 11 }}>Entrenador</span></div>
            <Initials name={fullName} image={profile.avatar_url} />
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
