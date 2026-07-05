import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useMenu, useCategories } from '../hooks/useData'
import { useToast } from '../context/ToastContext'
import { Button, Card, Input, Select, Badge, PageLoader, EmptyState } from '../components/UI'
import { Modal, ConfirmDialog } from '../components/Modal'
import { IconPlus, IconEdit, IconTrash, IconSearch } from '../components/Icons'
import { money } from '../utils/format'

const STATUS_LABEL = {
  available: { text: 'เปิดขาย', color: 'green' },
  out_of_stock: { text: 'สินค้าหมด', color: 'amber' },
  closed: { text: 'ปิดขาย', color: 'slate' },
}

const empty = { name: '', price: '', category_id: '', status: 'available', image_url: '' }

export default function MenuManage() {
  const { menu, loading, reload } = useMenu()
  const { categories } = useCategories()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null) // null = เพิ่มใหม่
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  const filtered = useMemo(() => {
    return menu.filter((m) => {
      const okSearch = m.name.toLowerCase().includes(search.toLowerCase())
      const okCat = !filterCat || m.category_id === filterCat
      return okSearch && okCat
    })
  }, [menu, search, filterCat])

  function openAdd() {
    setEditing(null)
    setForm(empty)
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({
      name: item.name,
      price: String(item.price),
      category_id: item.category_id || '',
      status: item.status,
      image_url: item.image_url || '',
    })
    setModalOpen(true)
  }

  async function uploadImage(file) {
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('menu-images').upload(path, file)
    if (error) {
      toast.error('อัปโหลดรูปไม่สำเร็จ: ' + error.message)
    } else {
      const { data } = supabase.storage.from('menu-images').getPublicUrl(path)
      setForm((f) => ({ ...f, image_url: data.publicUrl }))
      toast.success('อัปโหลดรูปสำเร็จ')
    }
    setUploading(false)
  }

  async function save() {
    if (!form.name.trim()) return toast.error('กรุณากรอกชื่อเมนู')
    if (!form.price || Number(form.price) < 0) return toast.error('กรุณากรอกราคาให้ถูกต้อง')

    setSaving(true)
    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      category_id: form.category_id || null,
      status: form.status,
      image_url: form.image_url || null,
    }

    let error
    if (editing) {
      const res = await supabase.from('menu').update(payload).eq('id', editing.id)
      error = res.error
    } else {
      const res = await supabase.from('menu').insert(payload)
      error = res.error
    }
    setSaving(false)

    if (error) return toast.error('บันทึกไม่สำเร็จ: ' + error.message)
    toast.success(editing ? 'แก้ไขเมนูสำเร็จ' : 'เพิ่มเมนูสำเร็จ')
    setModalOpen(false)
    reload()
  }

  async function remove(item) {
    const { error } = await supabase.from('menu').delete().eq('id', item.id)
    if (error) return toast.error('ลบไม่สำเร็จ: ' + error.message)
    toast.success('ลบเมนูสำเร็จ')
    reload()
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">จัดการเมนู</h1>
        <Button onClick={openAdd}><IconPlus /> เพิ่มเมนู</Button>
      </div>

      {/* ค้นหา + กรอง */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><IconSearch /></span>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-4 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            placeholder="ค้นหาชื่อเมนู..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white sm:w-56"
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
        >
          <option value="">ทุกหมวดหมู่</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🍽️" title="ไม่พบเมนู" subtitle="ลองเพิ่มเมนูใหม่ หรือปรับคำค้นหา" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((m) => (
            <Card key={m.id} className="flex flex-col p-3">
              <div className="mb-2 aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-700">
                {m.image_url
                  ? <img src={m.image_url} alt={m.name} className="h-full w-full object-cover" />
                  : <div className="flex h-full items-center justify-center text-4xl">🍲</div>}
              </div>
              <div className="flex-1">
                <p className="line-clamp-1 font-semibold text-slate-800 dark:text-white">{m.name}</p>
                <p className="text-xs text-slate-400">{m.categories?.name || 'ไม่มีหมวดหมู่'}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="font-bold text-brand-600">{money(m.price)}</span>
                  <Badge color={STATUS_LABEL[m.status].color}>{STATUS_LABEL[m.status].text}</Badge>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(m)}><IconEdit /></Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmDel(m)}><IconTrash /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal เพิ่ม/แก้ไข */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}>
        <div className="space-y-4">
          <Input label="ชื่อเมนู" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น ข้าวผัดกะเพราหมู" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="ราคา (บาท)" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="60" />
            <Select label="หมวดหมู่" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">- เลือกหมวดหมู่ -</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <Select label="สถานะ" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="available">เปิดขาย</option>
            <option value="out_of_stock">สินค้าหมด</option>
            <option value="closed">ปิดขาย</option>
          </Select>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">รูปภาพ</span>
            <div className="flex items-center gap-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-700">
                {form.image_url
                  ? <img src={form.image_url} alt="" className="h-full w-full object-cover" />
                  : <div className="flex h-full items-center justify-center text-2xl">🍲</div>}
              </div>
              <label className="flex-1 cursor-pointer rounded-xl border border-dashed border-slate-300 px-4 py-3 text-center text-sm text-slate-500 hover:border-brand-500 dark:border-slate-600">
                {uploading ? 'กำลังอัปโหลด...' : 'เลือกรูปภาพ'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files[0])} disabled={uploading} />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>ยกเลิก</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => remove(confirmDel)}
        title="ลบเมนู"
        message={`ต้องการลบ "${confirmDel?.name}" ใช่หรือไม่?`}
        confirmText="ลบ"
        danger
      />
    </div>
  )
}
