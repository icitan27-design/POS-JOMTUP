import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  IconDashboard, IconMenu, IconCart, IconChart, IconUsers,
  IconSettings, IconLogout, IconSun, IconMoon, IconReceipt,
} from './Icons'

// เมนูนำทาง + สิทธิ์ (adminOnly)
const NAV = [
  { to: '/', label: 'แดชบอร์ด', icon: IconDashboard, adminOnly: true, end: true },
  { to: '/order', label: 'รับออเดอร์', icon: IconCart, adminOnly: false },
  { to: '/bills', label: 'บิล / คิดเงิน', icon: IconReceipt, adminOnly: false },
  { to: '/menu', label: 'จัดการเมนู', icon: IconMenu, adminOnly: true },
  { to: '/table-qr', label: 'QR สั่งอาหาร', icon: IconReceipt, adminOnly: true },
  { to: '/reports', label: 'รายงานยอดขาย', icon: IconChart, adminOnly: true },
  { to: '/users', label: 'จัดการผู้ใช้', icon: IconUsers, adminOnly: true },
  { to: '/settings', label: 'ตั้งค่าร้าน', icon: IconSettings, adminOnly: true },
]

export default function Layout() {
  const { profile, isAdmin, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false) // sidebar มือถือ

  const items = NAV.filter((n) => !n.adminOnly || isAdmin)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-white transition-transform dark:bg-slate-800 dark:border-r dark:border-slate-700 md:relative md:translate-x-0 ${open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5 dark:border-slate-700">
          <span className="text-2xl">🍜</span>
          <span className="text-lg font-extrabold text-slate-800 dark:text-white">POS ร้านอาหาร</span>
        </div>
        <nav className="space-y-1 p-3">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`
              }
            >
              <n.icon />
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* overlay มือถือ */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}

      {/* พื้นที่หลัก */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-800">
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 md:hidden"
            onClick={() => setOpen(true)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="hidden md:block" />

          <div className="flex items-center gap-3">
            <button onClick={toggle} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700" title="สลับธีม">
              {dark ? <IconSun /> : <IconMoon />}
            </button>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{profile?.full_name}</p>
              <p className="text-xs text-slate-500">{isAdmin ? 'ผู้ดูแลระบบ' : 'พนักงานแคชเชียร์'}</p>
            </div>
            <button onClick={handleLogout} className="rounded-lg p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-900/30" title="ออกจากระบบ">
              <IconLogout />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
