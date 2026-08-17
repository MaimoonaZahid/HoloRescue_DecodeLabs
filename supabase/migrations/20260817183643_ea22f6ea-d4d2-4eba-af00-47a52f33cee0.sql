-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  cover_url TEXT,
  level TEXT NOT NULL DEFAULT 'Beginner',
  duration_hours NUMERIC NOT NULL DEFAULT 1,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  price_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO anon, authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses are public" ON public.courses FOR SELECT TO anon, authenticated USING (true);

-- lessons
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  duration_minutes INT NOT NULL DEFAULT 10,
  position INT NOT NULL DEFAULT 1,
  is_preview BOOLEAN NOT NULL DEFAULT false
);
GRANT SELECT ON public.lessons TO anon, authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons are listable" ON public.lessons FOR SELECT TO anon, authenticated USING (true);

-- enrollments
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  payment_status TEXT NOT NULL DEFAULT 'free',
  amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  paypal_order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own enrollments select" ON public.enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "enroll in free courses" ON public.enrollments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND payment_status = 'free'
    AND amount_paid = 0
    AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.is_premium = false)
  );

-- access helper
CREATE OR REPLACE FUNCTION public.has_course_access(_user_id UUID, _course_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses c WHERE c.id = _course_id AND c.is_premium = false
  ) OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = _course_id AND e.user_id = _user_id
      AND e.payment_status IN ('free', 'paid')
  );
$$;
GRANT EXECUTE ON FUNCTION public.has_course_access(UUID, UUID) TO authenticated, anon;

-- seed data
INSERT INTO public.courses (slug, title, summary, description, level, duration_hours, is_premium, price_usd) VALUES
('web-foundations', 'Modern Web Foundations', 'HTML, CSS and the mental models behind great interfaces.', 'A grounded introduction to how the web actually works. You will build a small site from scratch and understand every line of it.', 'Beginner', 6, false, 0),
('javascript-essentials', 'JavaScript Essentials', 'Variables, functions, async and the DOM, explained clearly.', 'Everything you need to be productive in JavaScript, without the jargon. Includes practical browser exercises.', 'Beginner', 8, false, 0),
('git-for-teams', 'Git for Teams', 'Branching, reviews and clean history in real projects.', 'Stop fearing merge conflicts. Learn the handful of Git commands that cover 95% of daily team work.', 'Intermediate', 4, false, 0),
('react-architecture', 'React Architecture in Practice', 'Composition, state boundaries and performance at scale.', 'A deep, opinionated course on structuring React applications that stay maintainable past 50 components.', 'Advanced', 12, true, 79.00),
('backend-apis', 'Production Backend APIs', 'Design, secure and ship APIs that survive real traffic.', 'Authentication, validation, pagination, rate limiting, observability and deployment — the full production checklist.', 'Advanced', 14, true, 99.00),
('ux-for-engineers', 'UX for Engineers', 'Ship interfaces that feel considered, not decorated.', 'Typography, spacing, hierarchy and motion, taught as engineering decisions rather than taste.', 'Intermediate', 7, true, 59.00);

INSERT INTO public.lessons (course_id, title, content, duration_minutes, position, is_preview)
SELECT c.id, l.title, l.content, l.mins, l.pos, l.preview
FROM public.courses c
JOIN (VALUES
  ('web-foundations', 'How the browser renders a page', 'The browser parses HTML into a DOM tree, applies CSS to build a render tree, lays it out, and paints. Understanding this order explains most layout surprises.', 18, 1, true),
  ('web-foundations', 'Semantic HTML that pays off', 'Choosing the right element gives you accessibility, SEO and default behaviour for free. We rebuild a page using landmarks and headings.', 22, 2, false),
  ('web-foundations', 'CSS layout without guesswork', 'Flexbox for one dimension, grid for two. We work through five real layouts and name the rule that solves each.', 26, 3, false),
  ('javascript-essentials', 'Values, references and scope', 'Why two objects that look identical are not equal, and how closures capture variables rather than values.', 20, 1, true),
  ('javascript-essentials', 'Asynchronous JavaScript', 'The event loop, promises and async/await, demonstrated with timing you can observe in the console.', 28, 2, false),
  ('javascript-essentials', 'Working with the DOM', 'Querying, updating and listening efficiently, plus the delegation pattern that keeps handlers manageable.', 24, 3, false),
  ('git-for-teams', 'A commit is a snapshot', 'Once you see commits as snapshots with parents, rebase and merge stop being mysterious.', 15, 1, true),
  ('git-for-teams', 'Branch, review, merge', 'A realistic team workflow: short branches, focused pull requests, and a readable history.', 20, 2, false),
  ('react-architecture', 'Component boundaries', 'Where to split components, and why prop drilling is usually a symptom of a misplaced boundary.', 25, 1, true),
  ('react-architecture', 'State that scales', 'Local, lifted, server and URL state — choosing the right home for each piece of data.', 32, 2, false),
  ('react-architecture', 'Rendering performance', 'Measuring before optimising: profiler traces, memo boundaries and list virtualisation.', 30, 3, false),
  ('react-architecture', 'Testing architecture', 'Testing behaviour rather than implementation, and the small set of tests that catch real regressions.', 28, 4, false),
  ('backend-apis', 'Designing resources', 'Modelling your domain into endpoints that stay stable as the product changes.', 22, 1, true),
  ('backend-apis', 'Authentication and sessions', 'Tokens, refresh strategies and the trade-offs between stateless and stateful sessions.', 34, 2, false),
  ('backend-apis', 'Validation and error contracts', 'Rejecting bad input at the edge, and returning errors clients can actually handle.', 26, 3, false),
  ('backend-apis', 'Observability and deployment', 'Structured logs, traces and health checks — knowing what your API is doing in production.', 30, 4, false),
  ('ux-for-engineers', 'Hierarchy and spacing', 'A consistent spacing scale and three type sizes will do more for your UI than any component library.', 20, 1, true),
  ('ux-for-engineers', 'Colour with intent', 'Building a small semantic palette and using contrast deliberately rather than decoratively.', 24, 2, false),
  ('ux-for-engineers', 'Motion that informs', 'Duration, easing and what animation should communicate — plus when to remove it entirely.', 22, 3, false)
) AS l(slug, title, content, mins, pos, preview) ON l.slug = c.slug;