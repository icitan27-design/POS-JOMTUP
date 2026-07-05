# 🍜 ระบบ POS ร้านอาหาร (React + Vite + Supabase)

ระบบขายหน้าร้านครบวงจร: รับออเดอร์ คิดเงิน พิมพ์ใบเสร็จ รายงานยอดขาย จัดการเมนู/ผู้ใช้
รองรับภาษาไทยทั้งหมด • ใช้งานได้ทั้งมือถือ/แท็บเล็ต/คอม • Dark Mode • ฟรี 100%

---

## 📋 สิ่งที่ต้องเตรียม (ทำครั้งเดียว)

1. ติดตั้ง **Node.js** เวอร์ชัน 18 ขึ้นไป → https://nodejs.org (โหลดตัว LTS)
2. สมัคร **Supabase** ฟรี → https://supabase.com

---

## 🚀 ขั้นตอนที่ 1: สร้างโปรเจกต์ Supabase

1. เข้า https://supabase.com แล้วกด **Sign in** (ล็อกอินด้วย GitHub หรืออีเมล)
2. กด **New project**
3. ตั้งชื่อโปรเจกต์ เช่น `pos-restaurant`
4. ตั้ง **Database Password** (จดเก็บไว้ให้ดี)
5. เลือก Region เป็น **Southeast Asia (Singapore)** จะเร็วสุดสำหรับไทย
6. กด **Create new project** แล้วรอสัก 1-2 นาทีให้สร้างเสร็จ

---

## 🗄️ ขั้นตอนที่ 2: สร้างตารางฐานข้อมูล

1. ในโปรเจกต์ Supabase เมนูซ้ายมือ กด **SQL Editor**
2. กด **+ New query**
3. เปิดไฟล์ `supabase/schema.sql` ในโฟลเดอร์นี้ → **คัดลอกทั้งหมด** ไปวางในช่อง SQL
4. กด **Run** (มุมขวาล่าง) — ถ้าขึ้น "Success" คือเสร็จเรียบร้อย ✅

> ระบบจะสร้างตาราง profiles, categories, menu, orders, order_items, payments, settings
> พร้อมตั้งค่าความปลอดภัย (RLS) และ bucket เก็บรูปให้อัตโนมัติ

---

## 🔑 ขั้นตอนที่ 3: เอา Key มาใส่ในโปรเจกต์

1. ในเมนูซ้าย กด **Project Settings** (รูปเฟือง) → **API**
2. คัดลอก 2 ค่านี้:
   - **Project URL** (เช่น `https://abcdefg.supabase.co`)
   - **anon public** key (ตัวยาวๆ ขึ้นต้นด้วย `eyJ...`)
3. ในโฟลเดอร์โปรเจกต์นี้ ให้คัดลอกไฟล์ `.env.example` เป็นไฟล์ใหม่ชื่อ `.env`
4. เปิดไฟล์ `.env` แล้วกรอกค่า:

```
VITE_SUPABASE_URL=https://abcdefg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi... (คีย์ของคุณ)
```

---

## 👤 ขั้นตอนที่ 4: สร้างบัญชี Admin คนแรก

เนื่องจากยังไม่มีผู้ใช้ในระบบ ต้องสร้าง Admin คนแรกด้วยมือ:

1. ใน Supabase เมนูซ้าย กด **Authentication** → **Users** → **Add user** → **Create new user**
2. กรอกอีเมล + รหัสผ่าน (เช่น `admin@shop.com` / `123456`)
3. **สำคัญ:** ติ๊ก **Auto Confirm User** ให้เป็นสีเขียว (ไม่ต้องยืนยันอีเมล)
4. กด **Create user**
5. ตอนนี้ผู้ใช้จะเป็น role `cashier` โดยอัตโนมัติ ต้องเปลี่ยนเป็น `admin`:
   - กด **SQL Editor** → New query → วางคำสั่งนี้ (แก้อีเมลให้ตรง):
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'admin@shop.com');
   ```
   - กด **Run**

> หลังจากมี Admin แล้ว คุณสร้างพนักงานคนอื่นได้จากในแอปหน้า "จัดการผู้ใช้" เลย ไม่ต้องมาทำใน Supabase อีก

---

## 💻 ขั้นตอนที่ 5: รันโปรเจกต์

เปิด Terminal (หรือ Command Prompt) ในโฟลเดอร์นี้ แล้วพิมพ์:

```bash
npm install
npm run dev
```

เปิดเบราว์เซอร์ไปที่ **http://localhost:5173**
ล็อกอินด้วยอีเมล/รหัสผ่านของ Admin ที่สร้างไว้ → เริ่มใช้งานได้เลย! 🎉

---

## ⚙️ ขั้นตอนที่ 6: ตั้งค่าร้าน (แนะนำให้ทำก่อนใช้จริง)

ล็อกอินเป็น Admin แล้วไปหน้า **ตั้งค่าร้าน**:
- ใส่ชื่อร้าน ที่อยู่ เบอร์โทร โลโก้
- ตั้งค่า **VAT** และ **Service Charge** (%) — ถ้าไม่ต้องการให้ใส่ 0
- ใส่ **เบอร์พร้อมเพย์** หรือเลขบัตรประชาชน → ระบบจะสร้าง QR PromptPay ที่จ่ายได้จริงตอนคิดเงินและบนใบเสร็จ

---

## 🖨️ การพิมพ์ใบเสร็จ

หน้าใบเสร็จเลือกขนาดได้ 3 แบบ: **A4 / 80mm / 58mm** แล้วกดปุ่ม **พิมพ์**
ระบบจะสั่งพิมพ์ผ่านเบราว์เซอร์ (รองรับเครื่องพิมพ์ใบเสร็จความร้อนที่ต่อกับคอม)

> เคล็ดลับ: ในหน้าต่างพิมพ์ของเบราว์เซอร์ ตั้ง Margin = None และปิด Headers/Footers เพื่อให้ใบเสร็จสวยที่สุด

---

## 👥 สิทธิ์การใช้งาน

| หน้า | Admin | Cashier |
|------|:---:|:---:|
| แดชบอร์ด | ✅ | ❌ |
| รับออเดอร์ | ✅ | ✅ |
| บิล / คิดเงิน | ✅ | ✅ |
| พิมพ์ใบเสร็จ | ✅ | ✅ |
| จัดการเมนู | ✅ | ❌ |
| รายงานยอดขาย | ✅ | ❌ |
| จัดการผู้ใช้ | ✅ | ❌ |
| ตั้งค่าร้าน | ✅ | ❌ |

---

## 📁 โครงสร้างโปรเจกต์

```
pos-restaurant/
├─ supabase/schema.sql      # SQL สร้างฐานข้อมูล (รันใน Supabase)
├─ .env.example             # ตัวอย่างไฟล์ตั้งค่า (คัดลอกเป็น .env)
├─ src/
│  ├─ lib/supabase.js       # เชื่อมต่อ Supabase
│  ├─ context/              # Auth, Theme (Dark Mode), Toast
│  ├─ hooks/useData.js      # ดึงข้อมูล menu/categories/settings
│  ├─ utils/                # format เงิน/วันที่, promptpay, export Excel/PDF
│  ├─ components/           # UI, Modal, Layout, Sidebar, ProtectedRoute, Icons
│  ├─ pages/                # Login, Dashboard, OrderTaking, Checkout,
│  │                        #   Receipt, Bills, MenuManage, Reports, Users, Settings
│  ├─ App.jsx               # Router + สิทธิ์การเข้าถึง
│  └─ main.jsx              # จุดเริ่มต้นแอป
└─ package.json
```

---

## 🛠️ คำสั่งที่ใช้บ่อย

```bash
npm run dev       # รันโหมดพัฒนา (http://localhost:5173)
npm run build     # สร้างไฟล์สำหรับขึ้น production (โฟลเดอร์ dist/)
npm run preview   # ทดสอบไฟล์ที่ build แล้ว
```

## ☁️ นำขึ้นใช้งานจริงฟรี (ถ้าต้องการ)

 deploy ฟรีได้ที่ **Vercel** หรือ **Netlify**:
1. push โค้ดขึ้น GitHub
2. เชื่อม repo กับ Vercel/Netlify
3. ใส่ Environment Variables 2 ตัว (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
4. Deploy

---

## ❓ แก้ปัญหาเบื้องต้น

- **ล็อกอินไม่ได้** → ตรวจว่าติ๊ก Auto Confirm User ตอนสร้างผู้ใช้แล้ว และค่าใน `.env` ถูกต้อง
- **หน้าจอขาว / ขึ้น error เรื่อง env** → ยังไม่ได้สร้างไฟล์ `.env` หรือใส่ค่าไม่ครบ (หลังแก้ `.env` ต้องรัน `npm run dev` ใหม่)
- **อัปโหลดรูปไม่ได้** → ตรวจว่ารัน schema.sql ครบ (มีส่วนสร้าง bucket `menu-images`) หากยังไม่ได้ ให้ไปสร้าง bucket ชื่อ `menu-images` แบบ Public เองใน Storage
- **QR พร้อมเพย์ไม่ขึ้น** → ไปกรอกเบอร์พร้อมเพย์ในหน้า "ตั้งค่าร้าน" ก่อน
```
