import { Link, useLocation } from "@tanstack/react-router";
import { Home, Calendar, MessageCircle, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/planner", label: "Planner", icon: Calendar },
  { to: "/doubt", label: "Doubts", icon: MessageCircle },
  { to: "/career", label: "Career", icon: Compass },
] as const;

export function BottomNav() {
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md grid grid-cols-4">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-3 text-xs transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-2xl transition-all",
                  active && "bg-primary/15 glow-primary",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              </span>
              <span className={cn("font-medium", active && "text-foreground")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
