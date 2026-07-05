import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'
import { useSettings } from '../hooks/useData'
import { useToast } from '../context/ToastContext'
import { Button, Card, Input, PageLoader } from '../components/UI'
import { money, baht } from '../utils/format'
import { promptPayPayload } from '../utils/promptpay'

const METHODS = [
  { key: 'cash', label: 'เงินสด', icon: '💵' },
  { key: 'promptpay', label: 'QR พร้อมเพย์', icon: '📱' },
  { key: 'transfer', label: 'โอนเงิน', icon: '🏦' },
  { key: 'credit', label: 'บัตรเครดิต', icon: '💳' },
]

export default function Checkout() {
  const { orderId } = useParams()
  const { settings } = useSettings()
  const toast = useToast()
  const navigate = useNavigate()

  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const [discount, setDiscount] = useState('')
  const [method, setMethod] = useState('cash')
  const [received, setReceived] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: o } = await supabase.from('orders').select('*').eq('id', orderId).single()
      const { data: it } = await supabase.from('order_items').select('*').eq('order_id', orderId)
      if (o?.status === 'paid') {
        toast.info('บิลนี้ชำระเงินแล้ว')
        navigate(`/receipt/${orderId}`)
        return
      }
      setOrder(o)
      setItems(it || [])
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const calc = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + Number(it.price) * it.qty, 0)
    const disc = Math.min(Number(discount) || 0, subtotal)
    const afterDisc = subtotal - disc
    const servicePct = Number(settings?.service_percent) || 0
    const vatPct = Number(settings?.vat_percent) || 0
    const service = (afterDisc * servicePct) / 100
    const vat = ((afterDisc + service) * vatPct) / 100
    const total = afterDisc + service + vat
    return { subtotal, disc, service, vat, total, servicePct, vatPct }
  }, [items, discount, settings])

  const change = Math.max(0, (Number(received) || 0) - calc.total)

  // สร้าง QR พร้อมเพย์เมื่อเลือกวิธีนี้
  useEffect(() => {
    if (method === 'promptpay' && settings?.promptpay_id) {
      const payload = promptPayPayload(settings.promptpay_id, calc.total)
      QRCode.toDataURL(payload, { width: 260, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(''))
    }
  }, [method, calc.total, settings])

  async function confirmPayment() {
    if (method === 'cash' && Number(received) < calc.total) {
      return toast.error('จำนวนเงินที่รับไม่พอ')
    }
    if (method === 'promptpay' && !settings?.promptpay_id) {
      return toast.error('ยังไม่ได้ตั้งค่าเบอร์พร้อมเพย์ในหน้าตั้งค่าร้าน')
    }

    setPaying(true)
    // อัปเดตบิล
    const { error: upErr } = await supabase
      .from('orders')
      .update({
        subtotal: calc.subtotal,
        discount: calc.disc,
        service_charge: calc.service,
        vat: calc.vat,
        total: calc.total,
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (upErr) { setPaying(false); return toast.error('บันทึกไม่สำเร็จ: ' + upErr.message) }

    // บันทึกการชำระเงิน
    await supabase.from('payments').insert({
      order_id: orderId,
      method,
      amount: calc.total,
      received: method === 'cash' ? Number(received) : null,
      change: method === 'cash' ? change : 0,
    })

    setPaying(false)
    toast.success('ชำระเงินสำเร็จ')
    navigate(`/receipt/${orderId}`)
  }

  if (loading) return <PageLoader />
  if (!order) return <p className="text-center text-slate-500">ไม่พบบิล</p>

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">คิดเงิน</h1>
        <span className="text-sm text-slate-500">
          บิล {order.order_no} · {order.order_type === 'dine_in' ? `โต๊ะ ${order.table_no}` : 'ซื้อกลับบ้าน'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* รายการ + สรุป */}
        <Card>
          <h2 className="mb-3 font-bold text-slate-800 dark:text-white">รายการอาหาร</h2>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {items.map((it) => (
              <div key={it.id} className="flex justify-between border-b border-slate-100 py-2 text-sm dark:border-slate-700">
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{it.name}</span>
                  <span className="text-slate-400"> × {it.qty}</span>
                  {it.note && <p className="text-xs text-amber-600">📝 {it.note}</p>}
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{money(it.price * it.qty)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm dark:border-slate-700">
            <Row label="ยอดรวม" value={money(calc.subtotal)} />
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-300">ส่วนลด (บาท)</span>
              <input
                type="number" min="0"
                className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-right outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
              />
            </div>
            {calc.servicePct > 0 && <Row label={`Service Charge ${calc.servicePct}%`} value={money(calc.service)} />}
            {calc.vatPct > 0 && <Row label={`VAT ${calc.vatPct}%`} value={money(calc.vat)} />}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-xl dark:border-slate-700">
              <span className="font-bold text-slate-800 dark:text-white">ยอดสุทธิ</span>
              <span className="font-extrabold text-brand-600">{money(calc.total)}</span>
            </div>
          </div>
        </Card>

        {/* วิธีชำระเงิน */}
        <Card>
          <h2 className="mb-3 font-bold text-slate-800 dark:text-white">วิธีชำระเงิน</h2>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMethod(m.key)}
                className={`flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition ${method === m.key ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}
              >
                <span className="text-xl">{m.icon}</span> {m.label}
              </button>
            ))}
          </div>

          {/* เงินสด */}
          {method === 'cash' && (
            <div className="mt-4 space-y-3">
              <Input label="รับเงินมา (บาท)" type="number" min="0" value={received} onChange={(e) => setReceived(e.target.value)} placeholder={String(Math.ceil(calc.total))} />
              <div className="flex flex-wrap gap-2">
                {[Math.ceil(calc.total), 100, 500, 1000].map((amt, i) => (
                  <button key={i} onClick={() => setReceived(String(amt))} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-brand-100 dark:bg-slate-700 dark:text-slate-200">
                    {amt === Math.ceil(calc.total) ? 'พอดี' : baht(amt)}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3 dark:bg-brand-900/30">
                <span className="font-semibold text-slate-700 dark:text-slate-200">เงินทอน</span>
                <span className="text-xl font-extrabold text-brand-600">{money(change)}</span>
              </div>
            </div>
          )}

          {/* พร้อมเพย์ */}
          {method === 'promptpay' && (
            <div className="mt-4 text-center">
              {settings?.promptpay_id ? (
                qrDataUrl ? (
                  <>
                    <img src={qrDataUrl} alt="PromptPay QR" className="mx-auto rounded-xl border border-slate-200 dark:border-slate-700" />
                    <p className="mt-2 text-sm text-slate-500">สแกนเพื่อจ่าย {money(calc.total)}</p>
                    <p className="text-xs text-slate-400">พร้อมเพย์: {settings.promptpay_id}</p>
                  </>
                ) : <p className="py-8 text-slate-400">กำลังสร้าง QR...</p>
              ) : (
                <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-900/30">
                  ⚠️ ยังไม่ได้ตั้งค่าเบอร์พร้อมเพย์<br />ไปที่หน้า "ตั้งค่าร้าน" เพื่อกรอกข้อมูล
                </p>
              )}
            </div>
          )}

          {/* โอน / บัตร */}
          {(method === 'transfer' || method === 'credit') && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-900">
              ยืนยันเมื่อได้รับ{method === 'transfer' ? 'การโอนเงิน' : 'การรูดบัตร'} {money(calc.total)} แล้ว
            </div>
          )}

          <Button size="lg" className="mt-5 w-full" onClick={confirmPayment} disabled={paying}>
            {paying ? 'กำลังบันทึก...' : `ยืนยันชำระเงิน ${money(calc.total)}`}
          </Button>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className="font-medium text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  )
}
