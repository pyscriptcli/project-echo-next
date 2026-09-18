-- Canonical Admin feature flag. Existing installations stay enabled unless an
-- administrator has already chosen a value.
update public.echo_forms_config
set config = jsonb_set(
  coalesce(config, '{}'::jsonb),
  '{features,askEchoEnabled}',
  coalesce(config #> '{features,askEchoEnabled}', 'true'::jsonb),
  true
), updated_at = now()
where id = 'global';

insert into public.echo_forms_config (id, config)
select 'global', '{"admins":[],"departments":[],"mappings":[],"features":{"askEchoEnabled":true}}'::jsonb
where not exists (select 1 from public.echo_forms_config where id = 'global');
