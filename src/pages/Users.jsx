import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { Button, Card, Input, Select, Badge, PageLoader, EmptyState } from '../components/UI'
import { Modal, ConfirmDialog } from '../components/Modal'
import { IconPlus, IconEdit } from '../components/Icons'
import { thaiDateShort } from '../utils/format'

const emptyForm = { email: '', password: '', full_name: '', role: 'cashier' }

export default function Users() {
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toggleTarget, setToggleTarget] = useState(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setUsers(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openAdd() { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  function openEdit(u) {
    setEditing(u)
    setForm({ email: '', password: '', full_name: u.full_name, role: u.role })
    setModalOpen(true)
  }

  async function save() {
    if (!form.full_name.trim()) return toast.error('กรุณากรอกชื่อพนักงาน')

    setSaving(true)
    if (editing) {
      // แก้ไข profile (ชื่อ + role)
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: form.full_name.trim(), role: form.role })
        .eq('id', editing.id)
      setSaving(false)
      if (error) return toast.error('บันทึกไม่สำเร็จ: ' + error.message)
      toast.success('แก้ไขข้อมูลสำเร็จ')
      setModalOpen(false)
      load()
    } else {
      // สร้าง user ใหม่ผ่าน signUp โดยใช้ client แยก (ไม่ให้ทับ session admin)
      if (!form.email.trim() || form.password.length < 6) {
        setSaving(false)
        return toast.error('กรุณากรอกอีเมล และรหัสผ่านอย่างน้อย 6 ตัวอักษร')
      }
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      )
      const { error } = await tempClient.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { full_name: form.full_name.trim(), role: form.role } },
      })
      setSaving(false)
      if (error) return toast.error('สร้างผู้ใช้ไม่สำเร็จ: ' + error.message)
      toast.success('เพิ่มพนักงานสำเร็จ (แจ้งให้เข้าสู่ระบบด้วยอีเมล/รหัสผ่านนี้)')
      setModalOpen(false)
      // profile ถูกสร้างโดย trigger; รอสักครู่แล้ว reload
      setTimeout(load, 800)
    }
  }

  async function toggleActive(u) {
    const { error } = await supabase.from('profiles').update({ active: !u.active }).eq('id', u.id)
    if (error) return toast.error('อัปเดตไม่สำเร็จ')
    toast.success(u.active ? 'ระงับบัญชีแล้ว' : 'เปิดใช้งานบัญชีแล้ว')
    load()
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">จัดการผู้ใช้</h1>
        <Button onClick={openAdd}><IconPlus /> เพิ่มพนักงาน</Button>
      </div>

      {users.length === 0 ? (
        <EmptyState icon="👥" title="ยังไม่มีผู้ใช้" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
              <tr className="text-left text-slate-500">
                <th className="px-5 py-3 font-semibold">ชื่อ</th>
                <th className="px-5 py-3 font-semibold">บทบาท</th>
                <th className="px-5 py-3 font-semibold">สถานะ</th>
                <th className="px-5 py-3 font-semibold">สร้างเมื่อ</th>
                <th className="px-5 py-3 text-right font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                  <td className="px-5 py-3 font-medium text-slate-800 dark:text-white">{u.full_name}</td>
                  <td className="px-5 py-3">
                    <Badge color={u.role === 'admin' ? 'blue' : 'slate'}>{u.role === 'admin' ? 'ผู้ดูแล' : 'แคชเชียร์'}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge color={u.active ? 'green' : 'red'}>{u.active ? 'ใช้งาน' : 'ระงับ'}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{thaiDateShort(u.created_at)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(u)}><IconEdit /></Button>
                      <Button variant={u.active ? 'danger' : 'primary'} size="sm" onClick={() => setToggleTarget(u)}>
                        {u.active ? 'ระงับ' : 'เปิด'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
        💡 <strong>หมายเหตุ:</strong> การรีเซ็ตรหัสผ่านให้พนักงานทำผ่าน Supabase Dashboard &gt; Authentication &gt; Users หรือให้พนักงานใช้ลิงก์ "ลืมรหัสผ่าน" ได้ (ต้องตั้งค่า Email ใน Supabase)
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงานใหม่'}>
        <div className="space-y-4">
          <Input label="ชื่อ-สกุล" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="สมชาย ใจดี" />
          {!editing && (
            <>
              <Input label="อีเมล" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="staff@example.com" />
              <Input label="รหัสผ่าน (อย่างน้อย 6 ตัว)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••" />
            </>
          )}
          <Select label="บทบาท" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="cashier">แคชเชียร์ (รับออเดอร์ + คิดเงิน)</option>
            <option value="admin">ผู้ดูแลระบบ (เข้าถึงทุกหน้า)</option>
          </Select>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>ยกเลิก</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={() => toggleActive(toggleTarget)}
        title={toggleTarget?.active ? 'ระงับบัญชี' : 'เปิดใช้งานบัญชี'}
        message={`ต้องการ${toggleTarget?.active ? 'ระงับ' : 'เปิดใช้งาน'}บัญชี "${toggleTarget?.full_name}" ใช่หรือไม่?`}
        confirmText="ยืนยัน"
        danger={toggleTarget?.active}
      />
    </div>
  )
}
