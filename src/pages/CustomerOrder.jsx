import { useState, useMemo, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { Button, Badge, PageLoader, EmptyState } from '../components/UI'
import { Modal } from '../components/Modal'
import { IconPlus, IconMinus, IconSearch, IconTrash, IconCart, IconCheck } from '../components/Icons'
import { money, genOrderNo } from '../utils/format'

const QUICK_NOTES = ['ไม่เผ็ด', 'เผ็ดน้อย', 'ไม่ผัก', 'ไม่ใส่ผงชูรส', 'เพิ่มไข่', 'พิเศษ', 'แยกน้ำจิ้ม']

// หน้าสำหรับลูกค้าสแกน QR สั่งอาหารเอง (ไม่ต้องล็อกอิน)
// เข้าผ่าน /menu-order?table=5  หรือ  /menu-order (ซื้อกลับบ้าน)
export default function CustomerOrder() {
  const [searchParams] = useSearchParams()
  const tableNo = searchParams.get('table') || ''
  const toast = useToast()

  const [menu, setMenu] = useState([])
  const [categories, setCategories] = useState([])
  const [shop, setShop] = useState(null)
  const [loading, setLoading] = useState(true)

  const [activeCat, setActiveCat] = useState('')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [noteFor, setNoteFor] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false) // สั่งสำเร็จแล้ว

  useEffect(() => {
    async function load() {
      const [{ data: m }, { data: c }, { data: s }] = await Promise.all([
        supabase.from('menu').select('*').eq('status', 'available').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('settings').select('shop_name, logo_url').eq('id', 1).single(),
      ])
      setMenu(m || [])
      setCategories(c || [])
      setShop(s || null)
      setLoading(false)
    }
    load()
  }, [])

  const shown = useMemo(() => {
    return menu.filter((m) => {
      const okCat = !activeCat || m.category_id === activeCat
      const okSearch = m.name.toLowerCase().includes(search.toLowerCase())
      return okCat && okSearch
    })
  }, [menu, activeCat, search])

  const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0)
  const cartCount = cart.reduce((s, i) => s + i.qty, 0)

  function addToCart(item) {
    setCart((c) => {
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
    setCart((c) => c.map((it) => (it.key === key ? { ...it, qty: Math.max(1, it.qty + delta) } : it)))
  }
  function removeItem(key) { setCart((c) => c.filter((it) => it.key !== key)) }
  function openNote(item) { setNoteFor(item); setNoteText(item.note || '') }
  function saveNote() {
    setCart((c) => c.map((it) => (it.key === noteFor.key ? { ...it, note: noteText } : it)))
    setNoteFor(null)
  }

  async function submitOrder() {
    if (cart.length === 0) return toast.error('กรุณาเลือกเมนูอย่างน้อย 1 รายการ')
    setSubmitting(true)

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        order_no: genOrderNo(),
        order_type: tableNo ? 'dine_in' : 'takeaway',
        table_no: tableNo || null,
        subtotal,
        total: subtotal,
        status: 'open', // เข้าร้านเป็นบิลรอชำระเงินทันที
        cashier_id: null, // ลูกค้าสั่งเอง ไม่มีแคชเชียร์
      })
      .select()
      .single()

    if (error) {
      setSubmitting(false)
      return toast.error('สั่งอาหารไม่สำเร็จ กรุณาเรียกพนักงาน')
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

    if (itemErr) return toast.error('บันทึกรายการไม่สำเร็จ กรุณาเรียกพนักงาน')

    setDone(true)
    setCart([])
  }

  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900"><PageLoader /></div>

  // หน้าจอหลังสั่งสำเร็จ
  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-center text-white">
        <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-white/20">
          <IconCheck className="h-14 w-14" />
        </div>
        <h1 className="text-3xl font-extrabold">สั่งอาหารสำเร็จ!</h1>
        <p className="mt-2 text-white/90">
          {tableNo ? `โต๊ะ ${tableNo} — ` : ''}ทางร้านได้รับออเดอร์แล้ว
          <br />กรุณารอสักครู่ อาหารกำลังจัดเตรียม
        </p>
        <Button variant="secondary" className="mt-8" onClick={() => setDone(false)}>
          สั่งเพิ่ม
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28 dark:bg-slate-900">
      {/* หัวร้าน */}
      <header className="sticky top-0 z-20 bg-white shadow-sm dark:bg-slate-800">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          {shop?.logo_url
            ? <img src={shop.logo_url} alt="" className="h-10 w-10 rounded-xl object-contain" />
            : <span className="text-3xl">🍜</span>}
          <div className="flex-1">
            <h1 className="font-extrabold text-slate-800 dark:text-white">{shop?.shop_name || 'สั่งอาหาร'}</h1>
            <p className="text-xs text-slate-500">{tableNo ? `โต๊ะ ${tableNo}` : 'ซื้อกลับบ้าน'}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4">
        {/* ค้นหา */}
        <div className="relative my-4">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><IconSearch /></span>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-4 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            placeholder="ค้นหาเมนู..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* หมวดหมู่ */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCat('')}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${!activeCat ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
          >ทั้งหมด</button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${activeCat === c.id ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
            >{c.name}</button>
          ))}
        </div>

        {/* เมนู */}
        {shown.length === 0 ? (
          <EmptyState icon="🍽️" title="ไม่พบเมนู" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {shown.map((m) => (
              <button
                key={m.id}
                onClick={() => addToCart(m)}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition active:scale-95 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="aspect-square overflow-hidden bg-slate-100 dark:bg-slate-700">
                  {m.image_url
                    ? <img src={m.image_url} alt={m.name} className="h-full w-full object-cover" />
                    : <div className="flex h-full items-center justify-center text-4xl">🍲</div>}
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-1 text-sm font-semibold text-slate-800 dark:text-white">{m.name}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-bold text-brand-600">{money(m.price)}</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white"><IconPlus className="h-4 w-4" /></span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ปุ่มตะกร้าลอยล่าง */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="mx-auto max-w-2xl">
            <Button size="lg" className="w-full justify-between" onClick={() => setNoteFor('CART')}>
              <span className="flex items-center gap-2"><IconCart /> ดูตะกร้า ({cartCount})</span>
              <span>{money(subtotal)}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Modal ตะกร้า */}
      <Modal open={noteFor === 'CART'} onClose={() => setNoteFor(null)} title="ตะกร้าของคุณ">
        {cart.length === 0 ? (
          <p className="py-8 text-center text-slate-400">ยังไม่มีรายการ</p>
        ) : (
          <>
            <div className="max-h-[50vh] space-y-3 overflow-y-auto">
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
                      <button onClick={() => changeQty(it.key, -1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-700 dark:text-white"><IconMinus /></button>
                      <span className="w-6 text-center font-bold dark:text-white">{it.qty}</span>
                      <button onClick={() => changeQty(it.key, 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-700 dark:text-white"><IconPlus /></button>
                    </div>
                    <button onClick={() => { const item = it; setNoteFor(null); setTimeout(() => openNote(item), 100) }} className="text-xs font-medium text-brand-600">+ หมายเหตุ</button>
                    <span className="font-bold text-slate-800 dark:text-white">{money(it.price * it.qty)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
              <div className="mb-3 flex items-center justify-between text-lg">
                <span className="font-semibold text-slate-600 dark:text-slate-300">รวม</span>
                <span className="font-extrabold text-brand-600">{money(subtotal)}</span>
              </div>
              <Button size="lg" className="w-full" onClick={submitOrder} disabled={submitting}>
                {submitting ? 'กำลังส่งออเดอร์...' : 'ยืนยันสั่งอาหาร'}
              </Button>
              <p className="mt-2 text-center text-xs text-slate-400">ชำระเงินที่เคาน์เตอร์ / เรียกพนักงาน</p>
            </div>
          </>
        )}
      </Modal>

      {/* Modal หมายเหตุ */}
      <Modal open={noteFor && noteFor !== 'CART'} onClose={() => setNoteFor(null)} title={`หมายเหตุ: ${noteFor?.name || ''}`} size="sm">
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_NOTES.map((n) => (
            <button
              key={n}
              onClick={() => setNoteText((t) => (t ? t + ', ' + n : n))}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600 hover:bg-brand-100 dark:bg-slate-700 dark:text-slate-200"
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
          <Button onClick={saveNote}>บันทึก</Button>
        </div>
      </Modal>
    </div>
  )
}
