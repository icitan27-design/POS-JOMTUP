import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { Button, Card, Input } from '../components/UI'
import { IconPrint } from '../components/Icons'
import { useSettings } from '../hooks/useData'

// หน้าสร้าง QR ประจำโต๊ะ ให้ admin พิมพ์ไปแปะแต่ละโต๊ะ
export default function TableQR() {
  const { settings } = useSettings()
  const [count, setCount] = useState(10)     // จำนวนโต๊ะ
  const [baseUrl, setBaseUrl] = useState('')
  const [qrList, setQrList] = useState([])

  // ตั้งค่า URL เริ่มต้นจากเว็บปัจจุบัน
  useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  async function generate() {
    const list = []
    for (let i = 1; i <= count; i++) {
      const url = `${baseUrl}/menu-order?table=${i}`
      const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 1 })
      list.push({ table: i, url, dataUrl })
    }
    setQrList(list)
  }

  return (
    <div className="space-y-6">
      <div className="no-print space-y-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">QR สั่งอาหารประจำโต๊ะ</h1>

        <Card className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            สร้าง QR Code สำหรับแต่ละโต๊ะ ลูกค้าสแกนแล้วสั่งอาหารเองได้ทันที ออเดอร์จะเข้ามาที่หน้า "บิล / คิดเงิน" ของร้าน
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="ที่อยู่เว็บของร้าน (URL)"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://ร้านคุณ.vercel.app"
            />
            <Input
              label="จำนวนโต๊ะ"
              type="number"
              min="1"
              max="100"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
          <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            ⚠️ ต้องใส่ URL จริงที่ deploy ขึ้นออนไลน์แล้ว (เช่น .vercel.app) — ห้ามใช้ localhost เพราะลูกค้าสแกนจากมือถือตัวเองจะเข้าไม่ได้
          </div>
          <div className="flex gap-3">
            <Button onClick={generate}>สร้าง QR</Button>
            {qrList.length > 0 && <Button variant="outline" onClick={() => window.print()}><IconPrint /> พิมพ์ทั้งหมด</Button>}
          </div>
        </Card>
      </div>

      {/* พื้นที่ QR (พิมพ์ได้) */}
      {qrList.length > 0 && (
        <div id="qr-print-area" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {qrList.map((q) => (
            <div key={q.table} className="qr-card flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-slate-700 dark:bg-slate-800">
              <p className="mb-1 text-lg font-extrabold text-slate-800 dark:text-white">{settings?.shop_name || 'ร้านอาหาร'}</p>
              <p className="mb-2 text-sm text-slate-500">สแกนเพื่อสั่งอาหาร</p>
              <img src={q.dataUrl} alt={`โต๊ะ ${q.table}`} className="w-full max-w-[200px]" />
              <p className="mt-2 text-2xl font-black text-brand-600">โต๊ะ {q.table}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
