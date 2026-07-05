import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { baht, thaiDateShort } from './format'

// Export รายการเป็นไฟล์ Excel (.xlsx)
export function exportExcel(rows, filename = 'report') {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'รายงาน')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// Export รายงานยอดขายเป็น PDF (ตาราง)
export function exportSalesPDF(orders, summary, filename = 'sales-report') {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('Sales Report', 14, 18)
  doc.setFontSize(10)
  doc.text(`Total: ${baht(summary.total)} THB  |  Bills: ${summary.count}`, 14, 26)

  autoTable(doc, {
    startY: 32,
    head: [['No.', 'Order', 'Date', 'Type', 'Total (THB)']],
    body: orders.map((o, i) => [
      i + 1,
      o.order_no,
      thaiDateShort(o.created_at),
      o.order_type === 'dine_in' ? 'Dine-in' : 'Takeaway',
      baht(o.total),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [6, 150, 104] },
  })

  doc.save(`${filename}.pdf`)
}
