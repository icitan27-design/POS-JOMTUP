import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button, Input, Spinner } from '../components/UI'

export default function Login() {
  const { login, session, loading: authLoading } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // ถ้าล็อกอินอยู่แล้ว เด้งเข้าแอป
  useEffect(() => {
    if (!authLoading && session) navigate('/')
  }, [session, authLoading, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) return toast.error('กรุณากรอกอีเมลและรหัสผ่าน')
    setLoading(true)
    const { error } = await login(email.trim(), password)
    setLoading(false)
    if (error) {
      toast.error('เข้าสู่ระบบไม่สำเร็จ: อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    } else {
      toast.success('เข้าสู่ระบบสำเร็จ')
      navigate('/')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-600 to-brand-800 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-800">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-4xl dark:bg-brand-900/40">🍜</div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">ระบบ POS ร้านอาหาร</h1>
          <p className="mt-1 text-sm text-slate-500">เข้าสู่ระบบเพื่อเริ่มใช้งาน</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="อีเมล"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
          <Input
            label="รหัสผ่าน"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? <Spinner className="h-5 w-5" /> : 'เข้าสู่ระบบ'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          ยังไม่มีบัญชี? ให้ผู้ดูแลระบบสร้างบัญชีให้ในหน้า "จัดการผู้ใช้"
        </p>
      </div>
    </div>
  )
}
