ALTER TABLE group_members
  ADD COLUMN rotation_order INT NOT NULL DEFAULT 0;

-- Back-fill existing members: rank by joined_at then user_id (for stable ties)
UPDATE group_members gm
SET rotation_order = sub.rn
FROM (
  SELECT user_id, group_id,
    ROW_NUMBER() OVER (
      PARTITION BY group_id ORDER BY joined_at, user_id
    ) - 1 AS rn
  FROM group_members
) sub
WHERE gm.user_id = sub.user_id AND gm.group_id = sub.group_id;

-- Update join function to assign next rotation_order for the group
CREATE OR REPLACE FUNCTION join_group_by_invite_code(p_invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  target_group_id UUID;
  next_order INT;
BEGIN
  SELECT id INTO target_group_id
  FROM public.groups
  WHERE public.groups.invite_code = p_invite_code;

  IF target_group_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  SELECT COALESCE(MAX(rotation_order) + 1, 0) INTO next_order
  FROM public.group_members
  WHERE group_id = target_group_id;

  INSERT INTO public.group_members (user_id, group_id, rotation_order)
  VALUES (auth.uid(), target_group_id, next_order)
  ON CONFLICT (user_id, group_id) DO NOTHING;

  RETURN target_group_id;
END;
$$;
