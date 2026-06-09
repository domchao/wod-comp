-- Broad grant to ensure anon can read all public tables.
-- Previous per-table grants only took effect for group_members;
-- using GRANT ON ALL TABLES avoids any per-table caching issue.
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
NOTIFY pgrst, 'reload schema';
