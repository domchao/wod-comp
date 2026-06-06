-- Test: grant to service_role to see if that's what anon requests actually use.
GRANT SELECT ON public.workouts    TO service_role;
GRANT SELECT ON public.submissions TO service_role;
GRANT SELECT ON public.profiles    TO service_role;
GRANT SELECT ON public.groups      TO service_role;
NOTIFY pgrst, 'reload schema';
