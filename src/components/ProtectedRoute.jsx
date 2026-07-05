import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from './UI'

// ป้องกันหน้าที่ต้องล็อกอิน + ตรวจสอบ role
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { session, profile, loading, isAdmin } = useAuth()

  if (loading) return <PageLoader />

  // ยังไม่ล็อกอิน -> ไปหน้า login
  if (!session) return <Navigate to="/login" replace />

  // บัญชีถูกปิดใช้งาน
  if (profile && profile.active === false) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="text-2xl font-bold text-red-600">บัญชีถูกระงับ</p>
          <p className="mt-2 text-slate-500">กรุณาติดต่อผู้ดูแลระบบ</p>
        </div>
      </div>
    )
  }

  // หน้าเฉพาะ admin แต่ผู้ใช้เป็น cashier -> เด้งไปหน้ารับออเดอร์
  if (adminOnly && !isAdmin) return <Navigate to="/order" replace />

  return children
}
