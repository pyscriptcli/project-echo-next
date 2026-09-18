-- Feature-level access governance for the singleton Admin configuration.
-- Idempotent and permissive: existing users retain access until an admin saves an explicit rule.
UPDATE public.echo_forms_config
SET config = jsonb_set(
  jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{defaultFeatureAccess}',
    COALESCE(config->'defaultFeatureAccess', '["ask-echo","notetaker-record","notetaker-upload","meetings-export","forms-rfp-autofill","forms-pdf-preview","forms-submit"]'::jsonb),
    true
  ),
  '{pagePermissions}',
  COALESCE(config->'pagePermissions', '[]'::jsonb),
  true
), updated_at = now()
WHERE id = 'global';

-- Existing rules without allowedFeatures are intentionally left to the application
-- compatibility normalizer, which treats them as the configured default feature set.
-- This avoids silently restricting users during rollout.
