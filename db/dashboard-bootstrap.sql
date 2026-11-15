-- Initial dashboard data, called only by the server after authentication.
-- Keep the existing campaign selection and statistics calculations.
create or replace function public.get_dashboard_bootstrap(p_commerce_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
with commerce as materialized (
  select m.id, m.name
  from public.commerces m
  where m.id = p_commerce_id and m.active = true
), campaigns as materialized (
  select c.id, c.name, c.active, c.created_at
  from public.campaigns c
  where c.commerce_id = p_commerce_id and exists (select 1 from commerce)
), selected as (
  select c.id
  from campaigns c
  order by (c.active is true) desc, c.created_at desc
  limit 1
)
select jsonb_build_object(
  'commerce', jsonb_build_object('id', m.id, 'name', m.name),
  'campaigns', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'active', c.active, 'created_at', c.created_at
    ) order by c.created_at desc)
    from campaigns c
  ), '[]'::jsonb),
  'campaignId', (select id from selected),
  'stats', (select public.get_dashboard_game_stats(p_commerce_id, s.id) from selected s)
)
from commerce m;
$function$;

revoke all on function public.get_dashboard_bootstrap(uuid) from public, anon, authenticated;
grant execute on function public.get_dashboard_bootstrap(uuid) to service_role;
