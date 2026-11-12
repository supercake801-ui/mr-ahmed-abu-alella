CREATE OR REPLACE FUNCTION public.admin_set_teacher_role(_user_id uuid, _grant boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'هذه العملية للإدارة فقط';
  END IF;

  IF _grant THEN
    DELETE FROM public.user_roles
    WHERE user_id = _user_id AND role = 'student'::public.app_role;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'teacher'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = _user_id AND role = 'teacher'::public.app_role;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'student'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_teacher_role(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_teacher_role(uuid, boolean) TO authenticated;