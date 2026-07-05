import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { Card, PageLoader } from '../components/UI'
import { money, isoDate } from '../utils/format'

function StatCard({ label, value, icon, accent }) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${accent}`}>{icon}</div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-extrabold text-slate-800 dark:text-white">{value}</p>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ todaySales: 0, todayBills: 0, monthSales: 0 })
  const [topItems, setTopItems] = useState([])
  const [chart, setChart] = useState([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const today = isoDate()
      const startMonth = today.slice(0, 8) + '01'

      // บิลที่ชำระแล้วเดือนนี้
      const { data: paid } = await supabase
        .from('orders')
        .select('total, created_at')
        .eq('status', 'paid')
        .gte('created_at', startMonth)

      const orders = paid || []
      const todayOrders = orders.filter((o) => o.created_at.slice(0, 10) === today)

      const todaySales = todayOrders.reduce((s, o) => s + Number(o.total), 0)
      const monthSales = orders.reduce((s, o) => s + Number(o.total), 0)

      // กราฟยอดขาย 7 วันล่าสุด
      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = isoDate(d)
        const sum = orders
          .filter((o) => o.created_at.slice(0, 10) === key)
          .reduce((s, o) => s + Number(o.total), 0)
        days.push({ date: d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }), ยอดขาย: Math.round(sum) })
      }

      // สินค้าขายดี (เดือนนี้)
      const { data: items } = await supabase
        .from('order_items')
        .select('name, qty, orders!inner(status, created_at)')
        .eq('orders.status', 'paid')
        .gte('orders.created_at', startMonth)

      const tally = {}
      ;(items || []).forEach((it) => {
        tally[it.name] = (tally[it.name] || 0) + it.qty
      })
      const top = Object.entries(tally)
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5)

      setStats({ todaySales, todayBills: todayOrders.length, monthSales })
      setChart(days)
      setTopItems(top)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">แดชบอร์ด</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="ยอดขายวันนี้" value={money(stats.todaySales)} icon="💰" accent="bg-brand-100 dark:bg-brand-900/40" />
        <StatCard label="จำนวนบิลวันนี้" value={stats.todayBills} icon="🧾" accent="bg-blue-100 dark:bg-blue-900/40" />
        <StatCard label="ยอดขายเดือนนี้" value={money(stats.monthSales)} icon="📈" accent="bg-amber-100 dark:bg-amber-900/40" />
        <StatCard label="เมนูขายดีอันดับ 1" value={topItems[0]?.name || '-'} icon="🏆" accent="bg-purple-100 dark:bg-purple-900/40" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-bold text-slate-800 dark:text-white">ยอดขาย 7 วันล่าสุด</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#12b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#12b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={50} />
                <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }} />
                <Area type="monotone" dataKey="ยอดขาย" stroke="#069668" strokeWidth={2.5} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-bold text-slate-800 dark:text-white">เมนูขายดี</h2>
          {topItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">ยังไม่มีข้อมูลการขาย</p>
          ) : (
            <ol className="space-y-3">
              {topItems.map((it, i) => (
                <li key={it.name} className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{i + 1}</span>
                  <span className="flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{it.name}</span>
                  <span className="text-sm font-bold text-brand-600">{it.qty} จาน</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  )
}
