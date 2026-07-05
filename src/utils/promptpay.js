// สร้าง payload QR PromptPay ตามมาตรฐาน EMVCo (ใช้ได้จริงกับแอปธนาคาร)
// อ้างอิงสเปคของธนาคารแห่งประเทศไทย

function crc16(data) {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

const f = (id, value) => id + String(value.length).padStart(2, '0') + value

// target = เบอร์มือถือ (10 หลัก) หรือเลขบัตรประชาชน (13 หลัก)
export function promptPayPayload(target, amount) {
  const clean = String(target || '').replace(/[^0-9]/g, '')
  let acc
  if (clean.length >= 13) {
    acc = clean.padStart(13, '0') // เลขบัตรประชาชน / เลขนิติบุคคล
  } else {
    // เบอร์มือถือ -> 0066 + เบอร์ตัดเลข 0 ตัวหน้า
    acc = '0066' + clean.replace(/^0/, '')
  }
  const merchantTag = clean.length >= 13 ? '03' : '01'
  const merchant = f('00', 'A000000677010111') + f(merchantTag, acc)

  let payload =
    f('00', '01') +
    f('01', amount ? '12' : '11') + // 12 = มีจำนวนเงิน, 11 = ไม่ระบุ
    f('29', merchant) +
    f('53', '764') + // สกุลเงินบาท
    (amount ? f('54', Number(amount).toFixed(2)) : '') +
    f('58', 'TH')

  payload += '6304'
  return payload + crc16(payload)
}
