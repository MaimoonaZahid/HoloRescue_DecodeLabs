import { Link } from "@tanstack/react-router";
import { Clock, Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice, type Course } from "@/lib/lms";

export function CourseCard({ course, enrolled }: { course: Course; enrolled?: boolean }) {
  return (
    <Link
      to="/courses/$slug"
      params={{ slug: course.slug }}
      className="surface-panel group flex flex-col gap-4 p-6 transition-colors hover:border-primary/50"
    >
      <div className="flex items-start justify-between gap-3">
        <Badge variant={course.is_premium ? "default" : "secondary"}>
          {course.is_premium ? (
            <Lock className="mr-1 size-3" aria-hidden />
          ) : (
            <Unlock className="mr-1 size-3" aria-hidden />
          )}
          {course.is_premium ? "Premium" : "Free"}
        </Badge>
        <span className="text-sm font-medium text-muted-foreground">{course.level}</span>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold leading-snug group-hover:text-primary">
          {course.title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{course.summary}</p>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-3.5" aria-hidden />
          {course.duration_hours} hrs
        </span>
        <span className="font-display text-sm font-semibold">
          {enrolled
            ? "Enrolled"
            : course.is_premium
              ? formatPrice(Number(course.price_usd))
              : "Free"}
        </span>
      </div>
    </Link>
  );
}
