-- Called by non-members to look up and join a group via invite code.
-- SECURITY DEFINER lets it bypass RLS so the invite code can be validated
-- before the caller is a member.
CREATE OR REPLACE FUNCTION join_group_by_invite_code(p_invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  target_group_id UUID;
BEGIN
  SELECT id INTO target_group_id
  FROM public.groups
  WHERE public.groups.invite_code = p_invite_code;

  IF target_group_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  INSERT INTO public.group_members (user_id, group_id)
  VALUES (auth.uid(), target_group_id)
  ON CONFLICT (user_id, group_id) DO NOTHING;

  RETURN target_group_id;
END;
$$;
