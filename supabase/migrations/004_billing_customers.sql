-- Phases 4-5: billing, customers, cancellation, permissions

create or replace function has_permission(p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when current_role_name() = 'admin' then true
    when current_role_name() = 'staff' then coalesce(
      (select (permissions->>p_key)::boolean from user_roles where user_id = auth.uid()), false)
    else false end
$$;

-- Staff need the view_sales permission to read sales; admin always can.
drop policy if exists "staff read sales" on sales;
drop policy if exists "staff read sale items" on sale_items;
create policy "read sales" on sales for select using (has_permission('view_sales'));
create policy "read sale items" on sale_items for select using (has_permission('view_sales'));

create or replace function normalize_address(a text) returns text language sql immutable as $$
  select trim(regexp_replace(lower(coalesce(a, '')), '[^a-z0-9]+', ' ', 'g'))
$$;

create or replace function normalize_mobile(m text) returns text language plpgsql immutable as $$
declare d text := regexp_replace(coalesce(m, ''), '\D', '', 'g');
begin
  if length(d) = 12 and left(d, 2) = '91' then d := right(d, 10);
  elsif length(d) = 11 and left(d, 1) = '0' then d := right(d, 10);
  end if;
  return d;
end $$;

-- ---------- Customers ----------
create or replace function create_customer(
  p_name text, p_mobile text, p_address text,
  p_confirm_mobile boolean default false, p_confirm_address boolean default false
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_mobile text := normalize_mobile(p_mobile);
  v_addr text := trim(coalesce(p_address, ''));
  v_norm text := normalize_address(p_address);
  v_id uuid; v_code text; v_dups jsonb;
begin
  if not has_permission('register_customers') then raise exception 'You do not have permission to register customers.'; end if;
  if length(v_name) < 2 then raise exception 'Enter the customer name.'; end if;
  if length(v_mobile) <> 10 then raise exception 'Enter a valid 10-digit mobile number.'; end if;
  if length(v_addr) < 3 then raise exception 'Enter the customer address.'; end if;

  select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'code', customer_code, 'mobile', mobile))
    into v_dups from customers where mobile = v_mobile;
  if v_dups is not null and not (is_admin() and p_confirm_mobile) then
    return jsonb_build_object('status', 'duplicate_mobile', 'matches', v_dups);
  end if;

  select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'code', c.customer_code, 'mobile', c.mobile))
    into v_dups from customer_addresses a join customers c on c.id = a.customer_id
   where a.is_current and a.normalized_address = v_norm;
  if v_dups is not null and not p_confirm_address then
    return jsonb_build_object('status', 'shared_address', 'matches', v_dups);
  end if;

  insert into customers (name, mobile, mobile_duplicate_confirmed)
  values (v_name, v_mobile, is_admin() and p_confirm_mobile)
  returning id, customer_code into v_id, v_code;
  insert into customer_addresses (customer_id, address, normalized_address, shared_address_confirmed)
  values (v_id, v_addr, v_norm, v_dups is not null and p_confirm_address);
  insert into audit_logs (actor_id, action, table_name, record_id, details)
  values (auth.uid(), 'customer.create', 'customers', v_id, jsonb_build_object('code', v_code));

  return jsonb_build_object('status', 'created', 'id', v_id, 'code', v_code, 'name', v_name, 'mobile', v_mobile);
end $$;

create or replace function update_customer(
  p_id uuid, p_name text, p_mobile text, p_address text,
  p_confirm_mobile boolean default false, p_confirm_address boolean default false
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_mobile text := normalize_mobile(p_mobile);
  v_addr text := trim(coalesce(p_address, ''));
  v_norm text := normalize_address(p_address);
  v_old text; v_dups jsonb;
begin
  if not is_admin() then raise exception 'Only the admin can edit customers.'; end if;
  if length(v_name) < 2 then raise exception 'Enter the customer name.'; end if;
  if length(v_mobile) <> 10 then raise exception 'Enter a valid 10-digit mobile number.'; end if;
  if length(v_addr) < 3 then raise exception 'Enter the customer address.'; end if;
  perform 1 from customers where id = p_id for update;
  if not found then raise exception 'Customer not found.'; end if;

  select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'code', customer_code, 'mobile', mobile))
    into v_dups from customers where mobile = v_mobile and id <> p_id;
  if v_dups is not null and not p_confirm_mobile then
    return jsonb_build_object('status', 'duplicate_mobile', 'matches', v_dups);
  end if;

  select address into v_old from customer_addresses where customer_id = p_id and is_current;
  if v_old is distinct from v_addr then
    select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'code', c.customer_code, 'mobile', c.mobile))
      into v_dups from customer_addresses a join customers c on c.id = a.customer_id
     where a.is_current and a.normalized_address = v_norm and c.id <> p_id;
    if v_dups is not null and not p_confirm_address then
      return jsonb_build_object('status', 'shared_address', 'matches', v_dups);
    end if;
    update customer_addresses set is_current = false where customer_id = p_id and is_current;
    insert into customer_addresses (customer_id, address, normalized_address, shared_address_confirmed)
    values (p_id, v_addr, v_norm, v_dups is not null);
    if v_old is not null then
      insert into customer_address_history (customer_id, old_address, new_address, changed_by)
      values (p_id, v_old, v_addr, auth.uid());
    end if;
  end if;

  update customers set name = v_name, mobile = v_mobile,
         mobile_duplicate_confirmed = p_confirm_mobile or mobile_duplicate_confirmed
   where id = p_id;
  insert into audit_logs (actor_id, action, table_name, record_id) values (auth.uid(), 'customer.update', 'customers', p_id);
  return jsonb_build_object('status', 'updated', 'id', p_id);
end $$;

create or replace view customer_stats with (security_invoker = true) as
select c.id as customer_id,
       count(s.id) as total_purchases,
       coalesce(sum(s.grand_total), 0) as total_spent,
       max(s.created_at) as last_purchase_at
from customers c
left join sales s on s.customer_id = c.id and s.status = 'completed'
group by c.id;

-- ---------- Create a bill ----------
create or replace function create_sale(
  p_idempotency_key text, p_customer_id uuid, p_items jsonb,
  p_discount numeric, p_payment payment_method, p_notes text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_sale uuid; v_bill text; v_it record; v_prod products%rowtype; v_cust customers%rowtype;
  v_addr text; v_after numeric(14,3); v_line numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := round(coalesce(p_discount, 0), 2);
begin
  if not is_staff_or_admin() then raise exception 'Not allowed.'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then raise exception 'Missing request key. Reload the page.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Add at least one product.'; end if;
  if jsonb_array_length(p_items) > 200 then raise exception 'Too many items on one bill.'; end if;
  if v_discount < 0 then raise exception 'Discount cannot be negative.'; end if;

  select id into v_sale from sales where idempotency_key = p_idempotency_key;
  if v_sale is not null then
    return jsonb_build_object('sale_id', v_sale, 'duplicate', true,
      'bill_number', (select bill_number from sales where id = v_sale));
  end if;

  if p_customer_id is not null then
    select * into v_cust from customers where id = p_customer_id and is_active;
    if not found then raise exception 'Customer not found.'; end if;
    select address into v_addr from customer_addresses where customer_id = p_customer_id and is_current;
  end if;

  v_bill := 'KGS-' || lpad(nextval('bill_number_seq')::text, 6, '0');
  begin
    insert into sales (bill_number, idempotency_key, customer_id, customer_name, customer_mobile, customer_address,
                       subtotal, discount, grand_total, payment_method, status, notes, created_by)
    values (v_bill, p_idempotency_key, p_customer_id, v_cust.name, v_cust.mobile, v_addr,
            0, 0, 0, p_payment, 'completed', nullif(trim(coalesce(p_notes, '')), ''), v_uid)
    returning id into v_sale;
  exception when unique_violation then
    select id into v_sale from sales where idempotency_key = p_idempotency_key;
    return jsonb_build_object('sale_id', v_sale, 'duplicate', true,
      'bill_number', (select bill_number from sales where id = v_sale));
  end;

  perform set_config('app.stock_write', 'on', true);

  for v_it in
    select (e->>'product_id')::uuid as product_id, round(sum((e->>'quantity')::numeric), 3) as qty
    from jsonb_array_elements(p_items) e group by 1 order by 1
  loop
    if v_it.qty is null or v_it.qty <= 0 then raise exception 'Quantity must be greater than zero.'; end if;

    select * into v_prod from products where id = v_it.product_id for update;
    if not found or v_prod.is_archived or not v_prod.is_active then
      raise exception 'A product on this bill is no longer available.';
    end if;
    if v_prod.current_stock < v_it.qty then
      raise exception 'Not enough stock for % (% available).', v_prod.name, v_prod.current_stock;
    end if;

    v_line := round(v_it.qty * v_prod.selling_price, 2);   -- price comes from the database, never the browser
    v_subtotal := v_subtotal + v_line;

    insert into sale_items (sale_id, product_id, product_name, sku, unit, quantity, unit_price, unit_cost, line_total)
    values (v_sale, v_prod.id, v_prod.name, v_prod.sku, v_prod.unit, v_it.qty, v_prod.selling_price, v_prod.purchase_price, v_line);

    update products set current_stock = current_stock - v_it.qty where id = v_prod.id
    returning current_stock into v_after;

    insert into stock_movements (product_id, movement_type, quantity_change, stock_after, reference_table, reference_id, created_by)
    values (v_prod.id, 'sale', -v_it.qty, v_after, 'sales', v_sale, v_uid);
  end loop;

  if v_discount > v_subtotal then raise exception 'Discount cannot be more than the bill total.'; end if;
  update sales set subtotal = v_subtotal, discount = v_discount, grand_total = v_subtotal - v_discount where id = v_sale;

  return jsonb_build_object('sale_id', v_sale, 'bill_number', v_bill, 'duplicate', false, 'grand_total', v_subtotal - v_discount);
end $$;

-- ---------- Cancel or refund a bill (never deleted) ----------
create or replace function cancel_sale(p_sale_id uuid, p_reason text, p_refund boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_sale sales%rowtype; v_it record; v_after numeric(14,3);
begin
  if not is_admin() then raise exception 'Only the admin can cancel or refund bills.'; end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then raise exception 'A reason is required.'; end if;
  select * into v_sale from sales where id = p_sale_id for update;
  if not found then raise exception 'Bill not found.'; end if;
  if v_sale.status <> 'completed' then raise exception 'This bill is already %.', v_sale.status; end if;

  perform set_config('app.stock_write', 'on', true);
  for v_it in
    select product_id, sum(quantity) as qty from sale_items where sale_id = p_sale_id group by 1 order by 1
  loop
    perform 1 from products where id = v_it.product_id for update;
    update products set current_stock = current_stock + v_it.qty where id = v_it.product_id
    returning current_stock into v_after;
    insert into stock_movements (product_id, movement_type, quantity_change, stock_after, reference_table, reference_id, reason, created_by)
    values (v_it.product_id, 'sale_reversal', v_it.qty, v_after, 'sales', p_sale_id, trim(p_reason), v_uid);
  end loop;

  update sales set status = case when p_refund then 'refunded'::sale_status else 'cancelled'::sale_status end,
         cancelled_at = now(), cancel_reason = trim(p_reason) where id = p_sale_id;
  insert into audit_logs (actor_id, action, table_name, record_id, details)
  values (v_uid, case when p_refund then 'sale.refund' else 'sale.cancel' end, 'sales', p_sale_id,
          jsonb_build_object('reason', trim(p_reason), 'bill', v_sale.bill_number));
  return jsonb_build_object('status', case when p_refund then 'refunded' else 'cancelled' end);
end $$;

revoke all on function create_customer(text, text, text, boolean, boolean) from public, anon;
revoke all on function update_customer(uuid, text, text, text, boolean, boolean) from public, anon;
revoke all on function create_sale(text, uuid, jsonb, numeric, payment_method, text) from public, anon;
revoke all on function cancel_sale(uuid, text, boolean) from public, anon;
grant execute on function create_customer(text, text, text, boolean, boolean) to authenticated;
grant execute on function update_customer(uuid, text, text, text, boolean, boolean) to authenticated;
grant execute on function create_sale(text, uuid, jsonb, numeric, payment_method, text) to authenticated;
grant execute on function cancel_sale(uuid, text, boolean) to authenticated;
