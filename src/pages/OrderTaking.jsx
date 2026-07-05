import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useMenu, useCategories, useSettings } from '../hooks/useData'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button, Card, Badge, PageLoader, EmptyState } from '../components/UI'
import { Modal } from '../components/Modal'
import { IconPlus, IconMinus, IconSearch, IconTrash, IconCart } from '../components/Icons'
import { money, genOrderNo } from '../utils/format'

const QUICK_NOTES = ['ไม่เผ็ด', 'เผ็ดน้อย', 'ไม่ผัก', 'ไม่ใส่ผงชูรส', 'เพิ่มไข่', 'พิเศษ', 'แยกน้ำจิ้ม']

export default function OrderTaking() {
  const { menu, loading } = useMenu()
  const { categories } = useCategories()
  const { settings } = useSettings()
  const { profile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [orderType, setOrderType] = useState('dine_in')
  const [tableNo, setTableNo] = useState('')
  const [activeCat, setActiveCat] = useState('')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([]) // { key, menu_id, name, price, qty, note }
  const [noteFor, setNoteFor] = useState(null) // รายการที่กำลังใส่หมายเหตุ
  const [noteText, setNoteText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const available = useMemo(
    () => menu.filter((m) => m.status === 'available'),
    [menu]
  )

  const shown = useMemo(() => {
    return available.filter((m) => {
      const okCat = !activeCat || m.category_id === activeCat
      const okSearch = m.name.toLowerCase().includes(search.toLowerCase())
      return okCat && okSearch
    })
  }, [available, activeCat, search])

  const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0)

  function addToCart(item) {
    setCart((c) => {
      // ถ้ามีเมนูเดิม (ไม่มีหมายเหตุ) ให้เพิ่มจำนวน
      const idx = c.findIndex((x) => x.menu_id === item.id && !x.note)
      if (idx >= 0) {
        const next = [...c]
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
        return next
      }
      return [...c, { key: Date.now() + Math.random(), menu_id: item.id, name: item.name, price: Number(item.price), qty: 1, note: '' }]
    })
  }

  function changeQty(key, delta) {
    setCart((c) =>
      c.map((it) => (it.key === key ? { ...it, qty: Math.max(1, it.qty + delta) } : it))
    )
  }

  function removeItem(key) {
    setCart((c) => c.filter((it) => it.key !== key))
  }

  function openNote(item) {
    setNoteFor(item)
    setNoteText(item.note || '')
  }

  function saveNote() {
    setCart((c) => c.map((it) => (it.key === noteFor.key ? { ...it, note: noteText } : it)))
    setNoteFor(null)
  }

  async function submitOrder() {
    if (cart.length === 0) return toast.error('กรุณาเลือกเมนูอย่างน้อย 1 รายการ')
    if (orderType === 'dine_in' && !tableNo.trim()) return toast.error('กรุณาระบุหมายเลขโต๊ะ')

    setSubmitting(true)
    // สร้างบิล (status = open) รอไปคิดเงิน
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        order_no: genOrderNo(),
        order_type: orderType,
        table_no: orderType === 'dine_in' ? tableNo.trim() : null,
        subtotal,
        total: subtotal, // ราคาสุทธิจะคำนวณตอนคิดเงิน
        status: 'open',
        cashier_id: profile?.id || null,
      })
      .select()
      .single()

    if (error) {
      setSubmitting(false)
      return toast.error('บันทึกออเดอร์ไม่สำเร็จ: ' + error.message)
    }

    const items = cart.map((it) => ({
      order_id: order.id,
      menu_id: it.menu_id,
      name: it.name,
      price: it.price,
      qty: it.qty,
      note: it.note || null,
    }))
    const { error: itemErr } = await supabase.from('order_items').insert(items)
    setSubmitting(false)

    if (itemErr) return toast.error('บันทึกรายการไม่สำเร็จ: ' + itemErr.message)

    toast.success('บันทึกออเดอร์สำเร็จ')
    setCart([])
    setTableNo('')
    // ไปหน้าคิดเงินของบิลนี้เลย
    navigate(`/checkout/${order.id}`)
  }

  if (loading) return <PageLoader />

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ฝั่งเมนู */}
      <div className="flex-1 space-y-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">รับออเดอร์</h1>

        {/* ประเภทออเดอร์ */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setOrderType('dine_in')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${orderType === 'dine_in' ? 'bg-white text-brand-600 shadow dark:bg-slate-700' : 'text-slate-500'}`}
            >🍽️ ทานที่ร้าน</button>
            <button
              onClick={() => setOrderType('takeaway')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${orderType === 'takeaway' ? 'bg-white text-brand-600 shadow dark:bg-slate-700' : 'text-slate-500'}`}
            >🥡 ซื้อกลับบ้าน</button>
          </div>
          {orderType === 'dine_in' && (
            <input
              className="w-32 rounded-xl border border-slate-300 bg-white px-4 py-2 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              placeholder="โต๊ะที่..."
              value={tableNo}
              onChange={(e) => setTableNo(e.target.value)}
            />
          )}
        </div>

        {/* ค้นหา */}
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><IconSearch /></span>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-4 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            placeholder="ค้นหาเมนู..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* หมวดหมู่ */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCat('')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${!activeCat ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
          >ทั้งหมด</button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${activeCat === c.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
            >{c.name}</button>
          ))}
        </div>

        {/* กริดเมนู */}
        {shown.length === 0 ? (
          <EmptyState icon="🔍" title="ไม่พบเมนู" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map((m) => (
              <button
                key={m.id}
                onClick={() => addToCart(m)}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:border-brand-400 hover:shadow-md active:scale-95 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="aspect-square overflow-hidden bg-slate-100 dark:bg-slate-700">
                  {m.image_url
                    ? <img src={m.image_url} alt={m.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                    : <div className="flex h-full items-center justify-center text-4xl">🍲</div>}
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-1 text-sm font-semibold text-slate-800 dark:text-white">{m.name}</p>
                  <p className="font-bold text-brand-600">{money(m.price)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ตะกร้า */}
      <div className="lg:w-96">
        <Card className="lg:sticky lg:top-0">
          <div className="mb-3 flex items-center gap-2">
            <IconCart />
            <h2 className="font-bold text-slate-800 dark:text-white">รายการที่สั่ง</h2>
            {cart.length > 0 && <Badge color="green">{cart.reduce((s, i) => s + i.qty, 0)} รายการ</Badge>}
          </div>

          {cart.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">ยังไม่มีรายการ<br />แตะที่เมนูเพื่อเพิ่ม</p>
          ) : (
            <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
              {cart.map((it) => (
                <div key={it.key} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">{it.name}</p>
                      <p className="text-xs text-slate-400">{money(it.price)}</p>
                      {it.note && <p className="mt-1 text-xs text-amber-600">📝 {it.note}</p>}
                    </div>
                    <button onClick={() => removeItem(it.key)} className="text-slate-400 hover:text-red-500"><IconTrash /></button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => changeQty(it.key, -1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm dark:bg-slate-700 dark:text-white"><IconMinus /></button>
                      <span className="w-6 text-center font-bold">{it.qty}</span>
                      <button onClick={() => changeQty(it.key, 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm dark:bg-slate-700 dark:text-white"><IconPlus /></button>
                    </div>
                    <button onClick={() => openNote(it)} className="text-xs font-medium text-brand-600 hover:underline">+ หมายเหตุ</button>
                    <span className="font-bold text-slate-800 dark:text-white">{money(it.price * it.qty)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="mb-3 flex items-center justify-between text-lg">
              <span className="font-semibold text-slate-600 dark:text-slate-300">รวม</span>
              <span className="font-extrabold text-brand-600">{money(subtotal)}</span>
            </div>
            <Button size="lg" className="w-full" onClick={submitOrder} disabled={submitting || cart.length === 0}>
              {submitting ? 'กำลังบันทึก...' : 'ยืนยันออเดอร์ → คิดเงิน'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Modal หมายเหตุ */}
      <Modal open={!!noteFor} onClose={() => setNoteFor(null)} title={`หมายเหตุ: ${noteFor?.name || ''}`} size="sm">
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_NOTES.map((n) => (
            <button
              key={n}
              onClick={() => setNoteText((t) => (t ? t + ', ' + n : n))}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600 hover:bg-brand-100 hover:text-brand-700 dark:bg-slate-700 dark:text-slate-200"
            >{n}</button>
          ))}
        </div>
        <textarea
          className="w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          rows="3"
          placeholder="เช่น ไม่เผ็ด เพิ่มไข่ดาว"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setNoteFor(null)}>ยกเลิก</Button>
          <Button onClick={saveNote}>บันทึกหมายเหตุ</Button>
        </div>
      </Modal>
    </div>
  )
}
