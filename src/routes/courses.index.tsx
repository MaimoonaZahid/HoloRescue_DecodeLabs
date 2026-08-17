import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/CourseCard";
import { coursesQuery, enrollmentsQuery } from "@/lib/lms";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "All courses — Emerald LMS" },
      {
        name: "description",
        content: "Browse every free and premium engineering course available on Emerald LMS.",
      },
      { property: "og:title", content: "All courses — Emerald LMS" },
      {
        property: "og:description",
        content: "Browse every free and premium engineering course on Emerald LMS.",
      },
    ],
  }),
  component: CoursesPage,
});

type Filter = "all" | "free" | "premium";

function CoursesPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const { user } = useAuth();
  const { data: courses, isLoading } = useQuery(coursesQuery);
  const { data: enrollments } = useQuery(enrollmentsQuery(user?.id));

  const enrolledIds = new Set((enrollments ?? []).map((e) => e.course_id));
  const list = (courses ?? []).filter((c) =>
    filter === "all" ? true : filter === "free" ? !c.is_premium : c.is_premium,
  );

  return (
    <div className="container-page py-14">
      <h1 className="text-3xl font-semibold">Courses</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Every course is self-paced. Free courses open immediately; premium courses unlock after
        checkout.
      </p>

      <div className="mt-8 flex gap-2">
        {(["all", "free", "premium"] as Filter[]).map((key) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? "default" : "outline"}
            onClick={() => setFilter(key)}
            className="capitalize"
          >
            {key}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading courses…</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((course) => (
            <CourseCard key={course.id} course={course} enrolled={enrolledIds.has(course.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
