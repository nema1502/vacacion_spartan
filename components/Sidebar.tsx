'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, FileText, LogOut,
  ChevronLeft, ChevronRight, Menu, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/empleados', label: 'Empleados', icon: Users },
  { href: '/reportes', label: 'Reportes', icon: FileText },
]

interface SidebarProps {
  userEmail?: string
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onOpenMobile: () => void
  onCloseMobile: () => void
}

export default function Sidebar({
  userEmail, collapsed, onToggleCollapse, mobileOpen, onCloseMobile, onOpenMobile,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => { onCloseMobile() }, [pathname])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const NavLinks = ({ mini, onClose }: { mini?: boolean; onClose?: () => void }) => (
    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            title={mini ? item.label : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
            } ${mini ? 'justify-center' : ''}`}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!mini && <span>{item.label}</span>}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Desktop sidebar Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <aside className={`hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col bg-[#1a365d] text-white transition-[width] duration-300 ease-in-out overflow-hidden ${collapsed ? 'w-16' : 'w-64'}`}>
        <div className={`flex items-center border-b border-white/10 h-16 flex-shrink-0 ${collapsed ? 'justify-center px-2' : 'px-3'}`}>
          {collapsed ? (
            <div className="bg-white rounded-md p-1 flex items-center justify-center">
              <img src="/logo.jpg" alt="Spartan" style={{width:'32px',height:'32px',objectFit:'contain'}} />
            </div>
          ) : (
            <div className="bg-white rounded-lg px-3 py-1.5 flex items-center justify-center">
              <img src="/logo.jpg" alt="Spartan Bolivia S.R.L." style={{maxWidth:'128px',maxHeight:'44px',objectFit:'contain'}} />
            </div>
          )}
        </div>

        <NavLinks mini={collapsed} />

        <div className={`border-t border-white/10 py-4 flex-shrink-0 ${collapsed ? 'flex flex-col items-center gap-3' : 'px-4'}`}>
          {!collapsed && userEmail && <p className="text-xs text-white/60 truncate mb-3">{userEmail}</p>}
          <button
            onClick={handleSignOut}
            title={collapsed ? 'Cerrar Sesión' : undefined}
            className={`flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors ${collapsed ? 'justify-center w-full' : 'w-full'}`}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && 'Cerrar Sesión'}
          </button>
        </div>

        <button
          onClick={onToggleCollapse}
          className="absolute -right-3.5 top-[4.25rem] z-50 flex items-center justify-center h-7 w-7 rounded-full bg-white border-2 border-[#1a365d]/50 text-[#1a365d] hover:bg-[#1a365d] hover:text-white hover:border-[#1a365d] shadow-lg ring-1 ring-black/5 transition-all"
          aria-label={collapsed ? 'Expandir menu' : 'Contraer menu'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Mobile top bar Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-[#1a365d] text-white flex items-center px-4 gap-3 shadow-md">
        <button onClick={onOpenMobile} className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors" aria-label="Abrir menú">
          <Menu className="h-6 w-6" />
        </button>
        <div className="bg-white rounded-md px-2 py-1">
          <img src="/logo.jpg" alt="Spartan Bolivia S.R.L." style={{maxWidth:'100px',maxHeight:'32px',objectFit:'contain'}} />
        </div>
      </header>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Mobile backdrop Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onCloseMobile} />
      )}

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Mobile drawer Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[#1a365d] text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/10 flex-shrink-0">
          <div className="bg-white rounded-lg px-3 py-1.5">
            <img src="/logo.jpg" alt="Spartan Bolivia S.R.L." style={{maxWidth:'116px',maxHeight:'40px',objectFit:'contain'}} />
          </div>
          <button onClick={onCloseMobile} className="p-1 text-white/60 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <NavLinks onClose={onCloseMobile} />

        <div className="px-4 py-4 border-t border-white/10 flex-shrink-0">
          {userEmail && <p className="text-xs text-white/60 truncate mb-3">{userEmail}</p>}
          <button onClick={handleSignOut} className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors w-full">
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  )
}