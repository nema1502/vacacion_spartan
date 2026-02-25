'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'

interface DashboardShellProps {
  userEmail?: string
  children: React.ReactNode
}

export default function DashboardShell({ userEmail, children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f7f8fc]">
      <Sidebar
        userEmail={userEmail}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onOpenMobile={() => setMobileOpen(true)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main content — shifts right on desktop based on sidebar width */}
      <main
        className={`min-h-screen transition-[margin-left] duration-300 ease-in-out
          pt-14 lg:pt-0
          ${collapsed ? 'lg:ml-16' : 'lg:ml-64'}
          p-4 sm:p-6`}
      >
        {children}
      </main>
    </div>
  )
}
