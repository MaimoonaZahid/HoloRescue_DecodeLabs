DROP VIEW public.lesson_outline;

CREATE TABLE public.lesson_content (
  lesson_id UUID PRIMARY KEY REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT ''
);
GRANT SELECT ON public.lesson_content TO anon, authenticated;
GRANT ALL ON public.lesson_content TO service_role;
ALTER TABLE public.lesson_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gated lesson content" ON public.lesson_content FOR SELECT TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND l.is_preview = true)
    OR public.has_course_access(auth.uid(), course_id)
  );

INSERT INTO public.lesson_content (lesson_id, course_id, body)
SELECT id, course_id, content FROM public.lessons;

ALTER TABLE public.lessons DROP COLUMN content;

DROP POLICY "accessible lesson content" ON public.lessons;
CREATE POLICY "lessons are public" ON public.lessons FOR SELECT TO anon, authenticated USING (true);