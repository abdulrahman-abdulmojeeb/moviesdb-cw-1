import { useState, useEffect } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  BarChart3,
  Star,
  TrendingUp,
  Brain,
  FolderHeart,
  User,
  Layers,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, hoverAnim: "group-hover:rotate-12" },
  { path: "/genres", label: "Genre Reports", icon: BarChart3, hoverAnim: "group-hover:-translate-y-0.5" },
  { path: "/ratings", label: "Rating Patterns", icon: Star, hoverAnim: "group-hover:rotate-[20deg]" },
  { path: "/predictions", label: "Predictions", icon: TrendingUp, hoverAnim: "group-hover:translate-x-0.5 group-hover:-translate-y-0.5" },
  { path: "/personality", label: "Personality", icon: Brain, hoverAnim: "group-hover:scale-110" },
  { path: "/collections", label: "Collections", icon: FolderHeart, hoverAnim: "group-hover:scale-110" },
  { path: "/my-ratings", label: "My Ratings", icon: Star, hoverAnim: "group-hover:rotate-[20deg]" },
  { path: "/build", label: "Build Details", icon: Layers, hoverAnim: "group-hover:-translate-y-0.5" },
]

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false) // eslint-disable-line react-hooks/set-state-in-effect -- valid pattern for closing menu on nav
  }, [location.pathname])

  return (
    <>
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between bg-muted border-b border-border px-4 md:hidden" role="banner">
        <span className="text-lg font-semibold text-foreground">
          <span className="text-primary">Movies</span>DB
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-sidebar"
        >
          {mobileOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </Button>
      </header>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="mobile-sidebar"
        role="navigation"
        aria-label="Main navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-48 flex-col bg-muted border-r border-border text-muted-foreground transition-transform duration-300",
          // Desktop: always visible
          "md:relative md:translate-x-0",
          // Mobile: slide in/out
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:flex"
        )}
      >
        {/* Logo/Brand */}
        <div className="flex h-14 items-center px-4">
          <span className="text-lg font-semibold text-foreground">
            <span className="text-primary">Movies</span>DB
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2 overflow-y-auto" aria-label="Primary navigation">
          <ul className="space-y-1" role="list">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavItem path={item.path} label={item.label} icon={item.icon} hoverAnim={item.hoverAnim} />
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="space-y-1 p-2">
          <NavItem path="/profile" label="Profile" icon={User} hoverAnim="group-hover:-translate-y-0.5" />
        </div>
      </aside>
    </>
  )
}

interface NavItemProps {
  path: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  hoverAnim?: string
}

function NavItem({ path, label, icon: Icon, hoverAnim }: NavItemProps) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "hover:bg-background hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          isActive
            ? "bg-background text-foreground"
            : "text-muted-foreground"
        )
      }
      aria-label={label}
    >
      {({ isActive }) => (
        <>
          <Icon className={cn("h-4 w-4 flex-shrink-0 transition-transform duration-200", hoverAnim)} aria-hidden="true" />
          <span>{label}</span>
          {isActive && <span className="sr-only">(current page)</span>}
        </>
      )}
    </NavLink>
  )
}
