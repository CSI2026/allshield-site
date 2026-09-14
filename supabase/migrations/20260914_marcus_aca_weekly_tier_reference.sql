-- Keep Marcus's approved ACA reference aligned with compensation plan v2.
update public.ai_employees
set config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
      'certification_build', 'B2026.09.14.040',
      'owner_approved_aca_reference',
      (coalesce(config->'owner_approved_aca_reference', '{}'::jsonb) - 'agent_monthly')
        || jsonb_build_object(
          'agent_monthly', '[]'::jsonb,
          'agent_weekly_rate_tier', jsonb_build_object(
            'threshold', 75,
            'base_rate', 15,
            'performance_rate', 20,
            'scope', 'all_weekly_units'
          )
        )
    ),
    updated_at = now()
where code = 'performance_analyst';
