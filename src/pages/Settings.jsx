import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSettings, useCategories } from '../hooks/useData'
import { useToast } from '../context/ToastContext'
import { Button, Card, Input, PageLoader, Badge } from '../components/UI'
import { IconPlus, IconTrash } from '../components/Icons'
import { ConfirmDialog } from '../components/Modal'

export default function Settings() {
  const { settings, loading, reload } = useSettings()
  const { categories, reload: reloadCat } = useCategories()
  const toast = useToast()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [delCat, setDelCat] = useState(null)

  useEffect(() => { if (settings) setForm(settings) }, [settings])

  if (loading || !form) return <PageLoader />

  async function saveSettings() {
    setSaving(true)
    const { error } = await supabase
      .from('settings')
      .update({
        shop_name: form.shop_name,
        address: form.address,
        phone: form.phone,
        logo_url: form.logo_url,
        vat_percent: Number(form.vat_percent) || 0,
        service_percent: Number(form.service_percent) || 0,
        promptpay_id: form.promptpay_id,
        footer_text: form.footer_text,
      })
      .eq('id', 1)
    setSaving(false)
    if (error) return toast.error('บันทึกไม่สำเร็จ: ' + error.message)
    toast.success('บันทึกการตั้งค่าสำเร็จ')
    reload()
  }

  async function uploadLogo(file) {
    if (!file) return
    setUploading(true)
    const path = `logo-${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('menu-images').upload(path, file)
    if (error) { setUploading(false); return toast.error('อัปโหลดไม่สำเร็จ') }
    const { data } = supabase.storage.from('menu-images').getPublicUrl(path)
    setForm((f) => ({ ...f, logo_url: data.publicUrl }))
    setUploading(false)
    toast.success('อัปโหลดโลโก้สำเร็จ (อย่าลืมกดบันทึก)')
  }

  async function addCategory() {
    if (!newCat.trim()) return
    const { error } = await supabase.from('categories').insert({ name: newCat.trim(), sort_order: categories.length + 1 })
    if (error) return toast.error('เพิ่มไม่สำเร็จ')
    setNewCat('')
    toast.success('เพิ่มหมวดหมู่สำเร็จ')
    reloadCat()
  }

  async function removeCategory(c) {
    const { error } = await supabase.from('categories').delete().eq('id', c.id)
    if (error) return toast.error('ลบไม่สำเร็จ')
    toast.success('ลบหมวดหมู่สำเร็จ')
    reloadCat()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">ตั้งค่าร้าน</h1>

      <Card className="space-y-4">
        <h2 className="font-bold text-slate-800 dark:text-white">ข้อมูลร้าน</h2>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-700">
            {form.logo_url ? <img src={form.logo_url} alt="" className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-3xl">🍜</div>}
          </div>
          <label className="cursor-pointer rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 hover:border-brand-500 dark:border-slate-600">
            {uploading ? 'กำลังอัปโหลด...' : 'เปลี่ยนโลโก้ร้าน'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e.target.files[0])} disabled={uploading} />
          </label>
        </div>
        <Input label="ชื่อร้าน" value={form.shop_name || ''} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} />
        <Input label="ที่อยู่" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <Input label="เบอร์โทร" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-bold text-slate-800 dark:text-white">ภาษี & ค่าบริการ</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input label="VAT (%)" type="number" min="0" value={form.vat_percent ?? 0} onChange={(e) => setForm({ ...form, vat_percent: e.target.value })} />
          <Input label="Service Charge (%)" type="number" min="0" value={form.service_percent ?? 0} onChange={(e) => setForm({ ...form, service_percent: e.target.value })} />
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-bold text-slate-800 dark:text-white">พร้อมเพย์ & ใบเสร็จ</h2>
        <Input
          label="เบอร์พร้อมเพย์ / เลขบัตรประชาชน (สำหรับสร้าง QR)"
          value={form.promptpay_id || ''}
          onChange={(e) => setForm({ ...form, promptpay_id: e.target.value })}
          placeholder="0812345678 หรือ 1234567890123"
        />
        <Input label="ข้อความท้ายใบเสร็จ" value={form.footer_text || ''} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-bold text-slate-800 dark:text-white">หมวดหมู่เมนู</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-2 rounded-full bg-slate-100 py-1.5 pl-4 pr-2 text-sm dark:bg-slate-700">
              {c.name}
              <button onClick={() => setDelCat(c)} className="rounded-full p-1 text-slate-400 hover:bg-red-100 hover:text-red-500"><IconTrash /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            placeholder="ชื่อหมวดหมู่ใหม่"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          />
          <Button onClick={addCategory}><IconPlus /> เพิ่ม</Button>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={saveSettings} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</Button>
      </div>

      <ConfirmDialog
        open={!!delCat}
        onClose={() => setDelCat(null)}
        onConfirm={() => removeCategory(delCat)}
        title="ลบหมวดหมู่"
        message={`ต้องการลบหมวดหมู่ "${delCat?.name}" ใช่หรือไม่? เมนูในหมวดนี้จะไม่มีหมวดหมู่`}
        confirmText="ลบ"
        danger
      />
    </div>
  )
}
