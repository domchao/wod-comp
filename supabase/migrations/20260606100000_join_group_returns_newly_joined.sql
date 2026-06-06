-- Return whether the user was actually inserted (vs already a member) so the
-- application can skip the push notification on repeat visits to the invite link.
DROP FUNCTION IF EXISTS join_group_by_invite_code(TEXT);

CREATE OR REPLACE FUNCTION join_group_by_invite_code(
  p_invite_code TEXT,
  OUT group_id UUID,
  OUT newly_joined BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  target_group_id UUID;
  v_row_count     INT;
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

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  group_id     := target_group_id;
  newly_joined := v_row_count > 0;
END;
$$;
