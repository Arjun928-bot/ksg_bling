-- Phase 2: product safeguards

-- Stock can only change through stock operations (Phase 3+ functions call
-- set_config('app.stock_write','on', true) inside their transaction).
create or replace function protect_stock() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('app.stock_write', true), '') <> 'on' then
    if tg_op = 'INSERT' then
      new.current_stock := 0;
    elsif new.current_stock is distinct from old.current_stock then
      raise exception 'Stock can only be changed through stock operations';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists products_protect_stock on products;
create trigger products_protect_stock before insert or update on products
for each row execute function protect_stock();

-- Allow signed-in staff/admin to write audit entries for their own actions.
create policy "write own audit" on audit_logs for insert
with check (is_staff_or_admin() and actor_id = auth.uid());
