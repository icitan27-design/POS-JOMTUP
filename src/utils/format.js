// แปลงตัวเลขเป็นเงินบาท เช่น 1250 -> "1,250.00"
export const baht = (n) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// แปลงเป็น "฿1,250.00"
export const money = (n) => '฿' + baht(n)

// วันที่ไทยแบบเต็ม เช่น "5 ก.ค. 2568 14:30"
export const thaiDate = (d) => {
  const date = new Date(d)
  return date.toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// วันที่แบบสั้น "5 ก.ค. 2568"
export const thaiDateShort = (d) =>
  new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })

// เวลาแบบ "14:30"
export const timeOnly = (d) =>
  new Date(d).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

// YYYY-MM-DD สำหรับ input[type=date] และ query
export const isoDate = (d = new Date()) => {
  const x = new Date(d)
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset())
  return x.toISOString().slice(0, 10)
}

// สร้างเลขบิล เช่น "B250705-1430-07"
export const genOrderNo = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(2)
  return `B${yy}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}-${p(Math.floor(Math.random() * 100))}`
}
