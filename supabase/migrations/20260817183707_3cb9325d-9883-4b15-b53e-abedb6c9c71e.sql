REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_course_access(UUID, UUID) FROM anon, authenticated, public;

DROP POLICY "lessons are listable" ON public.lessons;
CREATE POLICY "accessible lesson content" ON public.lessons FOR SELECT TO anon, authenticated
  USING (is_preview = true OR public.has_course_access(auth.uid(), course_id));

CREATE VIEW public.lesson_outline
WITH (security_invoker = false) AS
  SELECT id, course_id, title, duration_minutes, position, is_preview
  FROM public.lessons;
GRANT SELECT ON public.lesson_outline TO anon, authenticated;