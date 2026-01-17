import { useState, useEffect } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  BarChart3,
  Star,
  TrendingUp,
  Brain,
  FolderHeart,
  ChevronLeft,
  ChevronRight,
  User,
  Layers,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SidebarProps {
  isAuthenticated: boolean
  onLogout: () => void
}

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/genres", label: "Genre Reports", icon: BarChart3 },
  { path: "/ratings", label: "Rating Patterns", icon: Star },
  { path: "/predictions", label: "Predictions", icon: TrendingUp },
  { path: "/personality", label: "Personality", icon: Brain },
  { path: "/collections", label: "Collections", icon: FolderHeart },
  { path: "/build", label: "Build Details", icon: Layers },
]

const STORAGE_KEY = "sidebar-collapsed"

export function Sidebar({ isAuthenticated: _isAuthenticated, onLogout: _onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === "true"
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between bg-sidebar px-4 md:hidden" role="banner">
        <span className="text-lg font-semibold text-sidebar-foreground">MoviesDB</span>
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground"
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
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300",
          // Desktop: always visible
          "md:relative md:translate-x-0",
          collapsed ? "md:w-16" : "md:w-64",
          // Mobile: slide in/out
          mobileOpen ? "w-64 translate-x-0" : "-translate-x-full",
          "md:flex"
        )}
      >
        {/* Logo/Brand */}
        <div className="flex h-14 items-center px-4">
          {(!collapsed || mobileOpen) && (
            <span className="text-lg font-semibold">MoviesDB</span>
          )}
          {collapsed && !mobileOpen && <span className="mx-auto text-xl font-bold">M</span>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2 overflow-y-auto" aria-label="Primary navigation">
          <ul className="space-y-1" role="list">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavItem
                  path={item.path}
                  label={item.label}
                  icon={item.icon}
                  collapsed={collapsed && !mobileOpen}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="space-y-1 p-2">
          <NavItem
            path="/profile"
            label="Profile"
            icon={User}
            collapsed={collapsed && !mobileOpen}
          />
        </div>

        {/* Collapse toggle - only on desktop */}
        <div className="hidden md:block p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full flex-row gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed ? "justify-center px-2" : "justify-start"
                )}
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
              >
                {collapsed ? (
                  <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
                ) : (
                  <>
                    <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>Collapse</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}

interface NavItemProps {
  path: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  collapsed: boolean
}

function NavItem({ path, label, icon: Icon, collapsed }: NavItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavLink
          to={path}
          style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "0.75rem" }}
          className={({ isActive }) =>
            cn(
              "gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground",
              collapsed && "justify-center px-2"
            )
          }
          aria-label={collapsed ? label : undefined}
        >
          {({ isActive }) => (
            <>
              <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {!collapsed && <span>{label}</span>}
              {isActive && <span className="sr-only">(current page)</span>}
            </>
          )}
        </NavLink>
      </TooltipTrigger>
      {collapsed && <TooltipContent side="right">{label}</TooltipContent>}
    </Tooltip>
  )
}
