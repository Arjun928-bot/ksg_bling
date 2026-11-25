-- Phase 3: stock in, manual adjustment, stock history.
-- All stock changes run inside one transaction, lock the product row, and write a ledger entry.

alter table purchases add column if not exists idempotency_key text unique;

-- ---------- Record a purchase (Stock in). Reused by the Purchases screen in Phase 6. ----------
create or replace function record_purchase(
  p_supplier_name text, p_purchase_date date, p_notes text, p_items jsonb, p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_supplier uuid;
  v_name text := nullif(trim(coalesce(p_supplier_name, '')), '');
  v_purchase uuid;
  v_item record;
  v_total numeric(12,2) := 0;
  v_after numeric(14,3);
begin
  if not is_admin() then raise exception 'Only the admin can record stock in.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one product.';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then
    raise exception 'Missing request key. Reload the page and try again.';
  end if;

  select id into v_purchase from purchases where idempotency_key = p_idempotency_key;
  if v_purchase is not null then
    return jsonb_build_object('purchase_id', v_purchase, 'duplicate', true);
  end if;

  if v_name is not null then
    select id into v_supplier from suppliers where lower(name) = lower(v_name) limit 1;
    if v_supplier is null then
      insert into suppliers (name) values (v_name) returning id into v_supplier;
    end if;
  end if;

  begin
    insert into purchases (supplier_id, supplier_name, purchase_date, notes, created_by, idempotency_key)
    values (v_supplier, v_name, coalesce(p_purchase_date, current_date),
            nullif(trim(coalesce(p_notes, '')), ''), v_uid, p_idempotency_key)
    returning id into v_purchase;
  exception when unique_violation then
    select id into v_purchase from purchases where idempotency_key = p_idempotency_key;
    return jsonb_build_object('purchase_id', v_purchase, 'duplicate', true);
  end;

  perform set_config('app.stock_write', 'on', true);

  for v_item in
    select (e->>'product_id')::uuid as product_id,
           round((e->>'quantity')::numeric, 3) as qty,
           round((e->>'purchase_price')::numeric, 2) as price
    from jsonb_array_elements(p_items) e
    order by 1   -- consistent lock order avoids deadlocks
  loop
    if v_item.qty is null or v_item.qty <= 0 then raise exception 'Quantity must be greater than zero.'; end if;
    if v_item.price is null or v_item.price < 0 then raise exception 'Purchase price cannot be negative.'; end if;

    perform 1 from products where id = v_item.product_id and not is_archived for update;
    if not found then raise exception 'Product not found or archived.'; end if;

    insert into purchase_items (purchase_id, product_id, quantity, purchase_price, line_total)
    values (v_purchase, v_item.product_id, v_item.qty, v_item.price, round(v_item.qty * v_item.price, 2));
    v_total := v_total + round(v_item.qty * v_item.price, 2);

    update products
       set current_stock = current_stock + v_item.qty,
           purchase_price = v_item.price        -- latest cost; past bills keep their own cost snapshot
     where id = v_item.product_id
    returning current_stock into v_after;

    insert into stock_movements (product_id, movement_type, quantity_change, stock_after,
                                 reference_table, reference_id, created_by)
    values (v_item.product_id, 'purchase', v_item.qty, v_after, 'purchases', v_purchase, v_uid);
  end loop;

  update purchases set total_amount = v_total where id = v_purchase;
  insert into audit_logs (actor_id, action, table_name, record_id, details)
  values (v_uid, 'stock.in', 'purchases', v_purchase, jsonb_build_object('total', v_total));

  return jsonb_build_object('purchase_id', v_purchase, 'duplicate', false, 'total', v_total);
end $$;

-- ---------- Manual adjustment (damage, expiry, counting correction) ----------
create or replace function adjust_stock(p_product_id uuid, p_change numeric, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_change numeric(14,3) := round(coalesce(p_change, 0), 3);
  v_cur numeric(14,3);
  v_after numeric(14,3);
begin
  if not is_admin() then raise exception 'Only the admin can adjust stock.'; end if;
  if v_change = 0 then raise exception 'Enter a quantity greater than zero.'; end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then raise exception 'A reason is required.'; end if;

  select current_stock into v_cur from products
   where id = p_product_id and not is_archived for update;
  if not found then raise exception 'Product not found or archived.'; end if;

  v_after := v_cur + v_change;
  if v_after < 0 then
    raise exception 'Cannot remove more than the current stock (% available).', v_cur;
  end if;

  perform set_config('app.stock_write', 'on', true);
  update products set current_stock = v_after where id = p_product_id;

  insert into stock_movements (product_id, movement_type, quantity_change, stock_after,
                               reference_table, reason, created_by)
  values (p_product_id, 'adjustment', v_change, v_after, 'products', trim(p_reason), v_uid);

  insert into audit_logs (actor_id, action, table_name, record_id, details)
  values (v_uid, 'stock.adjust', 'products', p_product_id,
          jsonb_build_object('change', v_change, 'reason', trim(p_reason), 'stock_after', v_after));

  return jsonb_build_object('stock_after', v_after);
end $$;

revoke all on function record_purchase(text, date, text, jsonb, text) from public, anon;
revoke all on function adjust_stock(uuid, numeric, text) from public, anon;
grant execute on function record_purchase(text, date, text, jsonb, text) to authenticated;
grant execute on function adjust_stock(uuid, numeric, text) to authenticated;
