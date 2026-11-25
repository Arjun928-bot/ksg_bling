-- Phase 6: report functions (admin only)

create or replace function report_summary(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not is_admin() then raise exception 'Only the admin can view reports.'; end if;
  select jsonb_build_object(
    'bills',    (select count(*) from sales where status = 'completed' and created_at >= p_from and created_at < p_to),
    'revenue',  coalesce((select sum(grand_total) from sales where status = 'completed' and created_at >= p_from and created_at < p_to), 0),
    'discount', coalesce((select sum(discount) from sales where status = 'completed' and created_at >= p_from and created_at < p_to), 0),
    'items_sold', coalesce((select sum(i.quantity) from sale_items i join sales s on s.id = i.sale_id
                             where s.status = 'completed' and s.created_at >= p_from and s.created_at < p_to), 0),
    'cost',     coalesce((select sum(i.quantity * i.unit_cost) from sale_items i join sales s on s.id = i.sale_id
                           where s.status = 'completed' and s.created_at >= p_from and s.created_at < p_to), 0),
    'missing_cost_lines', (select count(*) from sale_items i join sales s on s.id = i.sale_id
                           where s.status = 'completed' and s.created_at >= p_from and s.created_at < p_to
                             and (i.unit_cost is null or i.unit_cost = 0)),
    'cancelled_bills', (select count(*) from sales where status = 'cancelled' and created_at >= p_from and created_at < p_to),
    'cancelled_amount', coalesce((select sum(grand_total) from sales where status = 'cancelled' and created_at >= p_from and created_at < p_to), 0),
    'refunded_bills', (select count(*) from sales where status = 'refunded' and created_at >= p_from and created_at < p_to),
    'refunded_amount', coalesce((select sum(grand_total) from sales where status = 'refunded' and created_at >= p_from and created_at < p_to), 0),
    'purchases_total', coalesce((select sum(total_amount) from purchases where created_at >= p_from and created_at < p_to), 0)
  ) into r;
  return r;
end $$;

create or replace function report_products(p_from timestamptz, p_to timestamptz)
returns table (product_id uuid, product_name text, sku text, unit product_unit, qty numeric, revenue numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Only the admin can view reports.'; end if;
  return query
    select i.product_id, max(i.product_name), max(i.sku), (array_agg(i.unit))[1], sum(i.quantity), sum(i.line_total)
      from sale_items i join sales s on s.id = i.sale_id
     where s.status = 'completed' and s.created_at >= p_from and s.created_at < p_to
     group by i.product_id order by sum(i.line_total) desc limit 1000;
end $$;

create or replace function report_customers(p_from timestamptz, p_to timestamptz)
returns table (customer_id uuid, customer_name text, customer_code text, bills bigint, spent numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Only the admin can view reports.'; end if;
  return query
    select s.customer_id, max(c.name), max(c.customer_code), count(*), sum(s.grand_total)
      from sales s join customers c on c.id = s.customer_id
     where s.status = 'completed' and s.created_at >= p_from and s.created_at < p_to
     group by s.customer_id order by sum(s.grand_total) desc limit 1000;
end $$;

revoke all on function report_summary(timestamptz, timestamptz) from public, anon;
revoke all on function report_products(timestamptz, timestamptz) from public, anon;
revoke all on function report_customers(timestamptz, timestamptz) from public, anon;
grant execute on function report_summary(timestamptz, timestamptz) to authenticated;
grant execute on function report_products(timestamptz, timestamptz) to authenticated;
grant execute on function report_customers(timestamptz, timestamptz) to authenticated;
