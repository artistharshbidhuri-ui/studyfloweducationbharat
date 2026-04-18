import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  rightSlot?: ReactNode;
}

export function AppShell({ children, title, subtitle, rightSlot }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md min-h-screen pb-24 relative">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute top-40 -right-20 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />

        {(title || subtitle) && (
          <header className="relative px-5 pt-8 pb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {subtitle && (
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  {subtitle}
                </p>
              )}
              {title && <h1 className="mt-1 text-3xl font-bold text-foreground">{title}</h1>}
            </div>
            {rightSlot}
          </header>
        )}

        <main className="relative px-5">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
