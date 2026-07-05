-- ============================================================
-- ระบบ POS ร้านอาหาร - Supabase Schema
-- รันไฟล์นี้ใน Supabase > SQL Editor > New Query > Run
-- ============================================================

-- ---------- ตาราง: profiles (ข้อมูลผู้ใช้ + role) ----------
-- ผูกกับ auth.users ของ Supabase Authentication
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'พนักงาน',
  role text not null default 'cashier' check (role in ('admin', 'cashier')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- ตาราง: categories (หมวดหมู่เมนู) ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- ตาราง: menu (เมนูอาหาร) ----------
create table if not exists public.menu (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null default 0,
  category_id uuid references public.categories(id) on delete set null,
  image_url text,
  -- available = เปิดขาย, out_of_stock = สินค้าหมด, closed = ปิดขาย
  status text not null default 'available' check (status in ('available','out_of_stock','closed')),
  created_at timestamptz not null default now()
);

-- ---------- ตาราง: orders (บิลออเดอร์) ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null,
  -- ประเภท: dine_in = ทานที่ร้าน, takeaway = ซื้อกลับบ้าน
  order_type text not null default 'dine_in' check (order_type in ('dine_in','takeaway')),
  table_no text,
  subtotal numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  service_charge numeric(10,2) not null default 0,
  vat numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  -- สถานะ: open = กำลังสั่ง, paid = ชำระแล้ว, cancelled = ยกเลิก
  status text not null default 'open' check (status in ('open','paid','cancelled')),
  cashier_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- ---------- ตาราง: order_items (รายการในบิล) ----------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_id uuid references public.menu(id) on delete set null,
  name text not null,
  price numeric(10,2) not null default 0,
  qty int not null default 1,
  note text,
  created_at timestamptz not null default now()
);

-- ---------- ตาราง: payments (การชำระเงิน) ----------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  -- วิธีชำระ: cash, promptpay, transfer, credit
  method text not null check (method in ('cash','promptpay','transfer','credit')),
  amount numeric(10,2) not null default 0,
  received numeric(10,2),        -- เงินที่รับมา (กรณีเงินสด)
  change numeric(10,2) default 0, -- เงินทอน
  created_at timestamptz not null default now()
);

-- ---------- ตาราง: settings (ตั้งค่าร้าน) ----------
create table if not exists public.settings (
  id int primary key default 1,
  shop_name text not null default 'ร้านอาหารตัวอย่าง',
  address text default '123 ถนนสุขุมวิท กรุงเทพฯ 10110',
  phone text default '02-000-0000',
  logo_url text,
  vat_percent numeric(5,2) not null default 7,
  service_percent numeric(5,2) not null default 0,
  promptpay_id text default '',        -- เบอร์พร้อมเพย์ หรือเลขบัตรประชาชน
  footer_text text default 'ขอบคุณที่ใช้บริการ',
  constraint settings_singleton check (id = 1)
);

-- ============================================================
-- ข้อมูลเริ่มต้น
-- ============================================================
insert into public.settings (id) values (1) on conflict (id) do nothing;

insert into public.categories (name, sort_order) values
  ('อาหารจานเดียว', 1),
  ('ก๋วยเตี๋ยว', 2),
  ('เครื่องดื่ม', 3),
  ('ของหวาน', 4)
on conflict do nothing;

-- ============================================================
-- ฟังก์ชันช่วย: เช็ค role ของผู้ใช้ปัจจุบัน
-- ============================================================
create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ============================================================
-- Trigger: สร้าง profile อัตโนมัติเมื่อมี user ใหม่
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'พนักงาน'),
    coalesce(new.raw_user_meta_data->>'role', 'cashier')
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- เปิด Row Level Security ทุกตาราง
-- ============================================================
alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.menu         enable row level security;
alter table public.orders       enable row level security;
alter table public.order_items  enable row level security;
alter table public.payments     enable row level security;
alter table public.settings     enable row level security;

-- ---------- Policies: profiles ----------
-- ทุกคนที่ล็อกอินอ่าน profile ตัวเองได้ / admin อ่านได้ทุกคน
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Policies: categories / menu ----------
-- อ่าน: ทุกคนที่ล็อกอิน | เขียน: admin เท่านั้น
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select using (auth.role() = 'authenticated');
drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists menu_read on public.menu;
create policy menu_read on public.menu for select using (auth.role() = 'authenticated');
drop policy if exists menu_write on public.menu;
create policy menu_write on public.menu for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Policies: orders / order_items / payments ----------
-- ทั้ง admin และ cashier ทำงานกับออเดอร์/ชำระเงินได้ทั้งหมด
drop policy if exists orders_all on public.orders;
create policy orders_all on public.orders for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists order_items_all on public.order_items;
create policy order_items_all on public.order_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists payments_all on public.payments;
create policy payments_all on public.payments for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------- Policies: settings ----------
-- อ่าน: ทุกคน | แก้ไข: admin เท่านั้น
drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select using (auth.role() = 'authenticated');
drop policy if exists settings_write on public.settings;
create policy settings_write on public.settings for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Storage bucket สำหรับรูปเมนู (รันได้ ถ้า error ให้สร้างเองใน UI)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

drop policy if exists "menu images public read" on storage.objects;
create policy "menu images public read" on storage.objects for select
  using (bucket_id = 'menu-images');

drop policy if exists "menu images admin write" on storage.objects;
create policy "menu images admin write" on storage.objects for insert
  with check (bucket_id = 'menu-images' and auth.role() = 'authenticated');

drop policy if exists "menu images admin update" on storage.objects;
create policy "menu images admin update" on storage.objects for update
  using (bucket_id = 'menu-images' and auth.role() = 'authenticated');

drop policy if exists "menu images admin delete" on storage.objects;
create policy "menu images admin delete" on storage.objects for delete
  using (bucket_id = 'menu-images' and auth.role() = 'authenticated');

-- เสร็จสิ้น ✅
