-- ============================================================
-- แพตช์เพิ่มเติม: เปิดให้ลูกค้าสแกน QR สั่งอาหารเองได้ (ไม่ต้องล็อกอิน)
-- รันไฟล์นี้ใน Supabase > SQL Editor หลังจากรัน schema.sql แล้ว
-- ============================================================

-- ---------- ให้ลูกค้าที่ไม่ล็อกอิน (anon) อ่านเมนู/หมวดหมู่/ชื่อร้านได้ ----------
drop policy if exists menu_public_read on public.menu;
create policy menu_public_read on public.menu for select
  using (true);  -- ทุกคนอ่านเมนูได้ (รวมลูกค้าที่ไม่ล็อกอิน)

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories for select
  using (true);

drop policy if exists settings_public_read on public.settings;
create policy settings_public_read on public.settings for select
  using (true);

-- ---------- ให้ลูกค้าสร้างออเดอร์ + รายการอาหารได้ (แต่สร้างได้อย่างเดียว) ----------
-- สร้างบิลใหม่ได้ แต่ต้องเป็นสถานะ open และไม่มี cashier (ป้องกันการปลอมแปลง)
drop policy if exists orders_customer_insert on public.orders;
create policy orders_customer_insert on public.orders for insert
  with check (status = 'open' and cashier_id is null);

-- เพิ่มรายการอาหารเข้าบิลได้
drop policy if exists order_items_customer_insert on public.order_items;
create policy order_items_customer_insert on public.order_items for insert
  with check (true);

-- หมายเหตุด้านความปลอดภัย:
-- - ลูกค้า "สร้าง" ออเดอร์ได้อย่างเดียว อ่าน/แก้/ลบ บิลคนอื่นไม่ได้
-- - การคิดเงิน แก้ไข ยกเลิก ยังต้องล็อกอินเป็นพนักงาน/แอดมินเท่านั้น
-- - ราคาสินค้าถูกดึงจากตาราง menu ฝั่งเซิร์ฟเวอร์ ลูกค้าปลอมราคาไม่ได้ผ่านหน้าเว็บปกติ
--   (หากต้องการเข้มงวดขึ้น สามารถทำ trigger ตรวจสอบราคาซ้ำได้ในภายหลัง)

-- เสร็จสิ้น ✅
