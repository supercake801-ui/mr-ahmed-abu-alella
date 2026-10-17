import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import lion from "@/assets/lion-mark.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="أسد التاريخ - الرئيسية">
      <img src={lion} alt="" className="h-10 w-10 object-contain" />
      <span className="leading-tight">
        <span className={`block font-display text-xl ${light ? "text-navy-foreground" : "text-navy"}`}>أسد التاريخ</span>
        <span className={`block text-xs ${light ? "text-navy-foreground/70" : "text-muted-foreground"}`}>أ. أحمد أبو العلا</span>
      </span>
    </Link>
  );
}

const linkCls =
  "rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground";
const activeCls = { className: "bg-accent text-foreground" };

export function SiteHeader() {
  const { session } = useAuth();
  const { isStaff, isAdmin } = useRoles();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
    navigate({ to: "/" });
  }

  const links = (
    <>
      <Link to="/" className={linkCls} activeProps={activeCls} activeOptions={{ exact: true }} onClick={() => setOpen(false)}>الرئيسية</Link>
      <Link to="/teacher" className={linkCls} activeProps={activeCls} onClick={() => setOpen(false)}>المدرس</Link>
      {session && (
        <Link to="/dashboard" className={linkCls} activeProps={activeCls} onClick={() => setOpen(false)}>لوحتي</Link>
      )}
      {isStaff && (
        <Link to="/studio" className={linkCls} activeProps={activeCls} onClick={() => setOpen(false)}>الاستوديو</Link>
      )}
      {isAdmin && (
        <Link to="/admin/users" className={linkCls} activeProps={activeCls} onClick={() => setOpen(false)}>الإدارة</Link>
      )}
    </>
  );

  const actions = session ? (
    <>
      <Button asChild variant="outline" size="sm"><Link to="/account" onClick={() => setOpen(false)}>حسابي</Link></Button>
      <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /> خروج</Button>
    </>
  ) : (
    <>
      <Button asChild variant="outline" size="sm"><Link to="/auth" search={{ mode: "signin" }} onClick={() => setOpen(false)}>دخول</Link></Button>
      <Button asChild size="sm"><Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)}>إنشاء حساب</Link></Button>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="القائمة الرئيسية">{links}</nav>
        <div className="hidden items-center gap-2 lg:flex">{actions}</div>
        <button
          className="rounded-md p-2 lg:hidden"
          aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-background px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="القائمة">{links}</nav>
          <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-navy text-navy-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <Logo light />
        <p className="text-sm text-navy-foreground/70">
          منصة تعليمية للدراسات الاجتماعية — التاريخ والجغرافيا. © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl text-navy">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">{text}</div>;
}
