-- setter_overrides and group_members were omitted from the earlier service_role
-- grant (20260606082145), causing the override lookup to always return null and
-- the workout card to show the rotation setter regardless of any override.
GRANT SELECT ON public.setter_overrides TO service_role;
GRANT SELECT ON public.group_members    TO service_role;
NOTIFY pgrst, 'reload schema';
