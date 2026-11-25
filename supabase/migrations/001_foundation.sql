-- KAISH GOLDEN SPICES billing: Phase 1 foundation schema
-- Run in Supabase SQL Editor (or `supabase db push`).

create extension if not exists pgcrypto;

-- ---------- Enums ----------
create type app_role as enum ('admin', 'staff');
create type product_unit as enum ('piece','packet','gram','kilogram','millilitre','litre','other');
create type payment_method as enum ('cash','upi','card','other');
create type sale_status as enum ('completed','cancelled','refunded');
create type stock_movement_type as enum ('purchase','sale','adjustment','sale_reversal','opening');

-- ---------- Helpers ----------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- Users and roles ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_roles (
  user_id uuid primary key references profiles(id) on delete cascade,
  role app_role not null default 'staff',
  -- admin-configurable staff permissions, e.g. {"view_sales":true,"view_stock":true}
  permissions jsonb not null default '{"view_sales":true,"view_stock":true,"register_customers":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  insert into user_roles (user_id, role) values (new.id, 'staff');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function handle_new_user();

create or replace function current_role_name() returns app_role
language sql stable security definer set search_path = public as $$
  select r.role from user_roles r join profiles p on p.id = r.user_id
  where r.user_id = auth.uid() and p.is_active
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_role_name() = 'admin', false)
$$;

create or replace function is_staff_or_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select current_role_name() is not null
$$;

-- ---------- Catalogue ----------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null unique,
  barcode text unique,
  category_id uuid references categories(id) on delete set null,
  description text,
  image_url text,
  unit product_unit not null default 'packet',
  purchase_price numeric(12,2) not null default 0 check (purchase_price >= 0),
  selling_price numeric(12,2) not null default 0 check (selling_price >= 0),
  current_stock numeric(14,3) not null default 0 check (current_stock >= 0),
  low_stock_limit numeric(14,3) not null default 5 check (low_stock_limit >= 0),
  is_active boolean not null default true,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_name_idx on products (lower(name));
create index products_category_idx on products (category_id);

create or replace view products_with_status
with (security_invoker = true) as
select p.*,
  case when p.current_stock <= 0 then 'out_of_stock'
       when p.current_stock <= p.low_stock_limit then 'low_stock'
       else 'in_stock' end as stock_status
from products p;

-- ---------- Customers ----------
create sequence customer_code_seq start 1;

create table customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null unique
    default ('KGS-CUS-' || lpad(nextval('customer_code_seq')::text, 4, '0')),
  name text not null,
  mobile text not null,
  -- same mobile is warned about in the app; admin may confirm a legitimate duplicate
  mobile_duplicate_confirmed boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_mobile_idx on customers (mobile);
create index customers_name_idx on customers (lower(name));

create table customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  address text not null,
  normalized_address text not null,
  -- admin confirmed this address is legitimately shared by several customers
  shared_address_confirmed boolean not null default false,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customer_addresses_norm_idx on customer_addresses (normalized_address);
create unique index one_current_address_per_customer on customer_addresses (customer_id) where is_current;

create table customer_address_history (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  old_address text not null,
  new_address text not null,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now()
);

-- ---------- Sales (written only through server-side functions in Phase 4) ----------
create sequence bill_number_seq start 1;

create table sales (
  id uuid primary key default gen_random_uuid(),
  bill_number text not null unique,
  idempotency_key text not null unique,   -- blocks duplicate bills on double submit / retry
  customer_id uuid references customers(id),
  -- snapshots so old bills never change when customer data changes
  customer_name text,
  customer_mobile text,
  customer_address text,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  grand_total numeric(12,2) not null check (grand_total >= 0),
  payment_method payment_method not null default 'cash',
  status sale_status not null default 'completed',
  notes text,
  cancelled_at timestamptz,
  cancel_reason text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sales_created_idx on sales (created_at desc);
create index sales_customer_idx on sales (customer_id);

create table sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete restrict,
  product_id uuid not null references products(id),
  -- price and name snapshot at time of sale
  product_name text not null,
  sku text not null,
  unit product_unit not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  unit_cost numeric(12,2),                -- purchase price snapshot, for reliable profit reports
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);
create index sale_items_sale_idx on sale_items (sale_id);
create index sale_items_product_idx on sale_items (product_id);

-- ---------- Purchases ----------
create table purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id),
  supplier_name text,
  purchase_date date not null default current_date,
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete restrict,
  product_id uuid not null references products(id),
  quantity numeric(14,3) not null check (quantity > 0),
  purchase_price numeric(12,2) not null check (purchase_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

-- ---------- Stock ledger ----------
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  movement_type stock_movement_type not null,
  quantity_change numeric(14,3) not null check (quantity_change <> 0),  -- +in / -out
  stock_after numeric(14,3) not null,
  reference_table text,
  reference_id uuid,
  reason text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index stock_movements_product_idx on stock_movements (product_id, created_at desc);

-- ---------- Settings and audit ----------
create table shop_settings (
  id boolean primary key default true check (id),   -- single row
  shop_name text not null default 'KAISH GOLDEN SPICES',
  address text,
  phone text,
  email text,
  gstin text,
  logo_url text,
  invoice_footer text not null default 'Thank you for shopping with KAISH GOLDEN SPICES.',
  currency text not null default 'INR',
  updated_at timestamptz not null default now()
);
insert into shop_settings default values;

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  table_name text,
  record_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on audit_logs (created_at desc);

-- ---------- updated_at triggers ----------
do $$
declare t text;
begin
  foreach t in array array['profiles','user_roles','categories','suppliers','products','customers',
    'customer_addresses','sales','purchases','shop_settings']
  loop
    execute format('create trigger %I_updated before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ---------- Row Level Security ----------
do $$
declare t text;
begin
  foreach t in array array['profiles','user_roles','categories','suppliers','products','customers',
    'customer_addresses','customer_address_history','sales','sale_items','purchases','purchase_items',
    'stock_movements','shop_settings','audit_logs']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- profiles / roles
create policy "own profile or admin read" on profiles for select using (id = auth.uid() or is_admin());
create policy "admin manages profiles" on profiles for all using (is_admin()) with check (is_admin());
create policy "own role or admin read" on user_roles for select using (user_id = auth.uid() or is_admin());
create policy "admin manages roles" on user_roles for all using (is_admin()) with check (is_admin());

-- catalogue: staff read, admin write
create policy "staff read categories" on categories for select using (is_staff_or_admin());
create policy "admin write categories" on categories for all using (is_admin()) with check (is_admin());
create policy "staff read suppliers" on suppliers for select using (is_admin());
create policy "admin write suppliers" on suppliers for all using (is_admin()) with check (is_admin());
create policy "staff read products" on products for select using (is_staff_or_admin());
create policy "admin write products" on products for all using (is_admin()) with check (is_admin());

-- customers: staff may read, register, and add addresses; only admin edits/deletes
create policy "staff read customers" on customers for select using (is_staff_or_admin());
create policy "staff register customers" on customers for insert with check (is_staff_or_admin());
create policy "admin update customers" on customers for update using (is_admin()) with check (is_admin());
create policy "staff read addresses" on customer_addresses for select using (is_staff_or_admin());
create policy "staff add addresses" on customer_addresses for insert with check (is_staff_or_admin());
create policy "admin update addresses" on customer_addresses for update using (is_admin()) with check (is_admin());
create policy "admin read address history" on customer_address_history for select using (is_admin());

-- sales, purchases, stock: read only from the client.
-- All writes go through SECURITY DEFINER functions added in later phases.
create policy "staff read sales" on sales for select using (is_staff_or_admin());
create policy "staff read sale items" on sale_items for select using (is_staff_or_admin());
create policy "admin read purchases" on purchases for select using (is_admin());
create policy "admin read purchase items" on purchase_items for select using (is_admin());
create policy "staff read stock movements" on stock_movements for select using (is_staff_or_admin());

-- settings: staff read (invoice header), admin write
create policy "staff read settings" on shop_settings for select using (is_staff_or_admin());
create policy "admin write settings" on shop_settings for update using (is_admin()) with check (is_admin());

create policy "admin read audit" on audit_logs for select using (is_admin());

-- ---------- Dashboard summary (one round trip) ----------
create or replace function dashboard_summary(day_start timestamptz, day_end timestamptz)
returns jsonb language sql stable security invoker as $$
  select jsonb_build_object(
    'today_sales',   coalesce((select sum(grand_total) from sales where status='completed' and created_at >= day_start and created_at < day_end), 0),
    'today_bills',   (select count(*) from sales where status='completed' and created_at >= day_start and created_at < day_end),
    'total_products',(select count(*) from products where is_archived = false),
    'total_customers',(select count(*) from customers where is_active),
    'total_stock',   coalesce((select sum(current_stock) from products where is_archived = false), 0),
    'low_stock',     (select count(*) from products where is_archived = false and is_active and current_stock > 0 and current_stock <= low_stock_limit),
    'out_of_stock',  (select count(*) from products where is_archived = false and is_active and current_stock <= 0)
  )
$$;

-- ---------- Storage bucket for product images (admin upload) ----------
insert into storage.buckets (id, name, public) values ('product-images','product-images', true)
on conflict (id) do nothing;
create policy "public read product images" on storage.objects for select using (bucket_id = 'product-images');
create policy "admin upload product images" on storage.objects for insert with check (bucket_id = 'product-images' and is_admin());
create policy "admin update product images" on storage.objects for update using (bucket_id = 'product-images' and is_admin());
create policy "admin delete product images" on storage.objects for delete using (bucket_id = 'product-images' and is_admin());
