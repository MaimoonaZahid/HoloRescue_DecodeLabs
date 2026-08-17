import { supabase } from "@/integrations/supabase/client";

export type Course = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  level: string;
  duration_hours: number;
  is_premium: boolean;
  price_usd: number;
};

export type Lesson = {
  id: string;
  title: string;
  duration_minutes: number;
  position: number;
  is_preview: boolean;
};

export type Enrollment = {
  id: string;
  course_id: string;
  payment_status: string;
  amount_paid: number;
  paypal_order_id: string | null;
  created_at: string;
};

const COURSE_FIELDS =
  "id, slug, title, summary, description, level, duration_hours, is_premium, price_usd";

export const coursesQuery = {
  queryKey: ["courses"],
  queryFn: async (): Promise<Course[]> => {
    const { data, error } = await supabase
      .from("courses")
      .select(COURSE_FIELDS)
      .order("is_premium")
      .order("title");
    if (error) throw error;
    return (data ?? []) as Course[];
  },
};

export function courseQuery(slug: string) {
  return {
    queryKey: ["course", slug],
    queryFn: async (): Promise<Course | null> => {
      const { data, error } = await supabase
        .from("courses")
        .select(COURSE_FIELDS)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data as Course) ?? null;
    },
  };
}

export function lessonsQuery(courseId: string) {
  return {
    queryKey: ["lessons", courseId],
    queryFn: async (): Promise<Lesson[]> => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, duration_minutes, position, is_preview")
        .eq("course_id", courseId)
        .order("position");
      if (error) throw error;
      return (data ?? []) as Lesson[];
    },
  };
}

export function lessonContentQuery(courseId: string) {
  return {
    queryKey: ["lesson-content", courseId],
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase
        .from("lesson_content")
        .select("lesson_id, body")
        .eq("course_id", courseId);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r) => [r.lesson_id, r.body]));
    },
  };
}

export function enrollmentsQuery(userId: string | undefined) {
  return {
    queryKey: ["enrollments", userId ?? "anon"],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Enrollment[]> => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("id, course_id, payment_status, amount_paid, paypal_order_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Enrollment[];
    },
  };
}

export async function enrollFree(userId: string, courseId: string) {
  const { error } = await supabase
    .from("enrollments")
    .insert({ user_id: userId, course_id: courseId, payment_status: "free", amount_paid: 0 });
  if (error && error.code !== "23505") throw error;
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}
