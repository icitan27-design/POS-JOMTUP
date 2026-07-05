import { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { Button, Card, Select, PageLoader, EmptyState } from '../components/UI'
import { money, isoDate, thaiDateShort } from '../utils/format'
import { exportExcel, exportSalesPDF } from '../utils/export'

export default function Reports() {
  const toast = useToast()
  const [mode, setMode] = useState('day') // day | month | year
  const [from, setFrom] = useState(isoDate())
  const [to, setTo] = useState(isoDate())
  const [orders, setOrders] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  // ปรับช่วงวันที่อัตโนมัติเมื่อเปลี่ยนโหมด
  useEffect(() => {
    const now = new Date()
    if (mode === 'day') {
      setFrom(isoDate()); setTo(isoDate())
    } else if (mode === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      setFrom(isoDate(first)); setTo(isoDate())
    } else {
      const first = new Date(now.getFullYear(), 0, 1)
      setFrom(isoDate(first)); setTo(isoDate())
    }
  }, [mode])

  async function load() {
    setLoading(true)
    const start = from + 'T00:00:00'
    const end = to + 'T23:59:59'
    const { data: o } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'paid')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at')
    const { data: it } = await supabase
      .from('order_items')
      .select('name, qty, orders!inner(status, created_at)')
      .eq('orders.status', 'paid')
      .gte('orders.created_at', start)
      .lte('orders.created_at', end)
    setOrders(o || [])
    setItems(it || [])
    setLoading(false)
  }

  useEffect(() => { load() }, []) // โหลดครั้งแรก // eslint-disable-line

  const summary = useMemo(() => {
    const total = orders.reduce((s, o) => s + Number(o.total), 0)
    return { total, count: orders.length, avg: orders.length ? total / orders.length : 0 }
  }, [orders])

  const topItems = useMemo(() => {
    const tally = {}
    items.forEach((it) => { tally[it.name] = (tally[it.name] || 0) + it.qty })
    return Object.entries(tally).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 8)
  }, [items])

  const chartData = useMemo(() => {
    const byDay = {}
    orders.forEach((o) => {
      const k = o.created_at.slice(0, 10)
      byDay[k] = (byDay[k] || 0) + Number(o.total)
    })
    return Object.entries(byDay).map(([date, total]) => ({
      date: thaiDateShort(date), ยอดขาย: Math.round(total),
    }))
  }, [orders])

  function doExportExcel() {
    if (orders.length === 0) return toast.error('ไม่มีข้อมูลให้ Export')
    const rows = orders.map((o, i) => ({
      ลำดับ: i + 1,
      เลขบิล: o.order_no,
      วันที่: thaiDateShort(o.created_at),
      ประเภท: o.order_type === 'dine_in' ? 'ทานที่ร้าน' : 'ซื้อกลับบ้าน',
      ยอดรวม: Number(o.subtotal),
      ส่วนลด: Number(o.discount),
      VAT: Number(o.vat),
      ยอดสุทธิ: Number(o.total),
    }))
    exportExcel(rows, `รายงานยอดขาย_${from}_${to}`)
    toast.success('Export Excel สำเร็จ')
  }

  function doExportPDF() {
    if (orders.length === 0) return toast.error('ไม่มีข้อมูลให้ Export')
    exportSalesPDF(orders, summary, `sales_${from}_${to}`)
    toast.success('Export PDF สำเร็จ')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">รายงานยอดขาย</h1>

      {/* ตัวกรอง */}
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <Select label="ช่วงเวลา" value={mode} onChange={(e) => setMode(e.target.value)} className="w-40">
            <option value="day">รายวัน</option>
            <option value="month">รายเดือน</option>
            <option value="year">รายปี</option>
          </Select>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">ตั้งแต่</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">ถึง</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
          </label>
          <Button onClick={load}>ค้นหา</Button>
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="outline" onClick={doExportExcel}>📊 Excel</Button>
            <Button variant="outline" onClick={doExportPDF}>📄 PDF</Button>
          </div>
        </div>
      </Card>

      {loading ? <PageLoader /> : (
        <>
          {/* สรุป */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card><p className="text-sm text-slate-500">ยอดขายรวม</p><p className="text-2xl font-extrabold text-brand-600">{money(summary.total)}</p></Card>
            <Card><p className="text-sm text-slate-500">จำนวนบิล</p><p className="text-2xl font-extrabold text-slate-800 dark:text-white">{summary.count}</p></Card>
            <Card><p className="text-sm text-slate-500">เฉลี่ยต่อบิล</p><p className="text-2xl font-extrabold text-slate-800 dark:text-white">{money(summary.avg)}</p></Card>
          </div>

          {orders.length === 0 ? (
            <EmptyState icon="📊" title="ไม่มีข้อมูลในช่วงที่เลือก" />
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <h2 className="mb-4 font-bold text-slate-800 dark:text-white">กราฟยอดขาย</h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} width={50} />
                      <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 12, border: 'none' }} />
                      <Bar dataKey="ยอดขาย" fill="#12b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card>
                <h2 className="mb-4 font-bold text-slate-800 dark:text-white">เมนูขายดี</h2>
                <ol className="space-y-2.5">
                  {topItems.map((it, i) => (
                    <li key={it.name} className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200'}`}>{i + 1}</span>
                      <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{it.name}</span>
                      <span className="text-sm font-bold text-brand-600">{it.qty}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
