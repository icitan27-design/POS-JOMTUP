import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'
import { useSettings } from '../hooks/useData'
import { Button, PageLoader } from '../components/UI'
import { IconPrint } from '../components/Icons'
import { money, thaiDate } from '../utils/format'
import { promptPayPayload } from '../utils/promptpay'

const SIZES = [
  { key: 'a4', label: 'A4' },
  { key: '80mm', label: '80mm' },
  { key: '58mm', label: '58mm' },
]

export default function Receipt() {
  const { orderId } = useParams()
  const { settings } = useSettings()
  const navigate = useNavigate()

  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [payment, setPayment] = useState(null)
  const [size, setSize] = useState('80mm')
  const [qr, setQr] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: o } = await supabase.from('orders').select('*').eq('id', orderId).single()
      const { data: it } = await supabase.from('order_items').select('*').eq('order_id', orderId)
      const { data: p } = await supabase.from('payments').select('*').eq('order_id', orderId).order('created_at', { ascending: false }).limit(1)
      setOrder(o)
      setItems(it || [])
      setPayment(p?.[0] || null)
      setLoading(false)
    }
    load()
  }, [orderId])

  useEffect(() => {
    if (settings?.promptpay_id && order) {
      const payload = promptPayPayload(settings.promptpay_id, order.total)
      QRCode.toDataURL(payload, { width: 150, margin: 0 }).then(setQr).catch(() => {})
    }
  }, [settings, order])

  if (loading) return <PageLoader />
  if (!order) return <p className="text-center text-slate-500">ไม่พบใบเสร็จ</p>

  const widthClass = size === 'a4' ? 'w-[210mm] max-w-full text-sm' : size === '80mm' ? 'w-[80mm]' : 'w-[58mm] text-xs'

  return (
    <div className="space-y-5">
      {/* แถบควบคุม (ไม่พิมพ์) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">ใบเสร็จรับเงิน</h1>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {SIZES.map((s) => (
              <button
                key={s.key}
                onClick={() => setSize(s.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${size === s.key ? 'bg-white text-brand-600 shadow dark:bg-slate-700' : 'text-slate-500'}`}
              >{s.label}</button>
            ))}
          </div>
          <Button variant="outline" onClick={() => navigate('/order')}>ออเดอร์ใหม่</Button>
          <Button onClick={() => window.print()}><IconPrint /> พิมพ์</Button>
        </div>
      </div>

      {/* ตัวใบเสร็จ */}
      <div className="flex justify-center">
        <div id="receipt" className={`receipt-paper mx-auto bg-white p-4 text-black shadow-lg ${widthClass}`}>
          <div className="text-center">
            {settings?.logo_url
              ? <img src={settings.logo_url} alt="logo" className="mx-auto mb-1 h-14 w-14 object-contain" />
              : <div className="mb-1 text-3xl">🍜</div>}
            <p className="text-base font-bold leading-tight">{settings?.shop_name}</p>
            {settings?.address && <p className="text-[11px] leading-tight">{settings.address}</p>}
            {settings?.phone && <p className="text-[11px]">โทร. {settings.phone}</p>}
          </div>

          <div className="my-2 border-t border-dashed border-black" />

          <div className="text-[11px] leading-relaxed">
            <div className="flex justify-between"><span>เลขที่บิล</span><span>{order.order_no}</span></div>
            <div className="flex justify-between"><span>วันที่</span><span>{thaiDate(order.paid_at || order.created_at)}</span></div>
            <div className="flex justify-between">
              <span>ประเภท</span>
              <span>{order.order_type === 'dine_in' ? `ทานที่ร้าน โต๊ะ ${order.table_no}` : 'ซื้อกลับบ้าน'}</span>
            </div>
          </div>

          <div className="my-2 border-t border-dashed border-black" />

          {/* รายการ */}
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-black">
                <th className="py-1 text-left font-semibold">รายการ</th>
                <th className="text-center font-semibold">จำนวน</th>
                <th className="text-right font-semibold">ราคา</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="align-top">
                  <td className="py-0.5">
                    {it.name}
                    {it.note && <div className="text-[10px] text-gray-500">({it.note})</div>}
                  </td>
                  <td className="text-center">{it.qty}</td>
                  <td className="text-right">{money(it.price * it.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="my-2 border-t border-dashed border-black" />

          <div className="space-y-0.5 text-[11px]">
            <Line label="ยอดรวม" value={money(order.subtotal)} />
            {order.discount > 0 && <Line label="ส่วนลด" value={'-' + money(order.discount)} />}
            {order.service_charge > 0 && <Line label="Service Charge" value={money(order.service_charge)} />}
            {order.vat > 0 && <Line label={`VAT ${settings?.vat_percent}%`} value={money(order.vat)} />}
            <div className="flex justify-between border-t border-black pt-1 text-sm font-bold">
              <span>ยอดสุทธิ</span><span>{money(order.total)}</span>
            </div>
            {payment && (
              <>
                <Line label={`ชำระโดย (${methodLabel(payment.method)})`} value={money(payment.amount)} />
                {payment.method === 'cash' && payment.received != null && (
                  <>
                    <Line label="รับเงิน" value={money(payment.received)} />
                    <Line label="เงินทอน" value={money(payment.change)} />
                  </>
                )}
              </>
            )}
          </div>

          {qr && (
            <div className="mt-3 text-center">
              <img src={qr} alt="พร้อมเพย์" className="mx-auto h-24 w-24" />
              <p className="text-[10px]">สแกนพร้อมเพย์เพื่อชำระเงิน</p>
            </div>
          )}

          <div className="mt-3 text-center text-[11px]">{settings?.footer_text}</div>
        </div>
      </div>
    </div>
  )
}

function Line({ label, value }) {
  return <div className="flex justify-between"><span>{label}</span><span>{value}</span></div>
}

function methodLabel(m) {
  return { cash: 'เงินสด', promptpay: 'พร้อมเพย์', transfer: 'โอนเงิน', credit: 'บัตรเครดิต' }[m] || m
}
