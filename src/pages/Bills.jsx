import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { Button, Card, Badge, PageLoader, EmptyState } from '../components/UI'
import { ConfirmDialog } from '../components/Modal'
import { IconReceipt, IconMoney, IconTrash } from '../components/Icons'
import { money, thaiDate } from '../utils/format'

const PAGE_SIZE = 8

export default function Bills() {
  const navigate = useNavigate()
  const toast = useToast()
  const [tab, setTab] = useState('open') // open | paid
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [cancelTarget, setCancelTarget] = useState(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', tab)
      .order('created_at', { ascending: false })
      .limit(100)
    setOrders(data || [])
    setPage(1)
    setLoading(false)
  }

  useEffect(() => { load() }, [tab]) // eslint-disable-line

  async function cancelOrder(o) {
    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', o.id)
    if (error) return toast.error('ยกเลิกไม่สำเร็จ')
    toast.success('ยกเลิกบิลแล้ว')
    load()
  }

  const totalPages = Math.ceil(orders.length / PAGE_SIZE)
  const paged = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">บิล / คิดเงิน</h1>

      <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button onClick={() => setTab('open')} className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${tab === 'open' ? 'bg-white text-brand-600 shadow dark:bg-slate-700' : 'text-slate-500'}`}>
          รอชำระเงิน
        </button>
        <button onClick={() => setTab('paid')} className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${tab === 'paid' ? 'bg-white text-brand-600 shadow dark:bg-slate-700' : 'text-slate-500'}`}>
          ชำระแล้ว
        </button>
      </div>

      {loading ? <PageLoader /> : paged.length === 0 ? (
        <EmptyState icon="🧾" title={tab === 'open' ? 'ไม่มีบิลที่รอชำระ' : 'ยังไม่มีบิลที่ชำระแล้ว'} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paged.map((o) => (
              <Card key={o.id} className="flex flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{o.order_no}</p>
                    <p className="text-xs text-slate-400">{thaiDate(o.created_at)}</p>
                  </div>
                  <Badge color={o.order_type === 'dine_in' ? 'blue' : 'amber'}>
                    {o.order_type === 'dine_in' ? `โต๊ะ ${o.table_no}` : 'กลับบ้าน'}
                  </Badge>
                </div>
                <p className="my-3 text-2xl font-extrabold text-brand-600">{money(o.total)}</p>
                <div className="mt-auto flex gap-2">
                  {tab === 'open' ? (
                    <>
                      <Button className="flex-1" onClick={() => navigate(`/checkout/${o.id}`)}><IconMoney /> คิดเงิน</Button>
                      <Button variant="danger" size="md" onClick={() => setCancelTarget(o)}><IconTrash /></Button>
                    </>
                  ) : (
                    <Button variant="outline" className="flex-1" onClick={() => navigate(`/receipt/${o.id}`)}><IconReceipt /> ดูใบเสร็จ</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>ก่อนหน้า</Button>
              <span className="px-3 text-sm text-slate-500">หน้า {page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>ถัดไป</Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelOrder(cancelTarget)}
        title="ยกเลิกบิล"
        message={`ต้องการยกเลิกบิล ${cancelTarget?.order_no} ใช่หรือไม่?`}
        confirmText="ยกเลิกบิล"
        danger
      />
    </div>
  )
}
