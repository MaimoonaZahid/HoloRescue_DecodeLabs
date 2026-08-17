import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Clock, Lock, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  courseQuery,
  enrollFree,
  enrollmentsQuery,
  formatPrice,
  lessonContentQuery,
  lessonsQuery,
} from "@/lib/lms";
import { confirmCheckout, isPaypalConfigured, startCheckout } from "@/lib/payments.functions";

export const Route = createFileRoute("/courses/$slug")({
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ");
    const title = `${name} — Emerald LMS course`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content: `Lessons, pricing and enrolment details for the ${name} course on Emerald LMS.`,
        },
        { property: "og:title", content: title },
        {
          property: "og:description",
          content: `Lessons, pricing and enrolment details for the ${name} course.`,
        },
      ],
    };
  },
  validateSearch: (
    search: Record<string, unknown>,
  ): { paypal_order?: string; paypal_cancelled?: string } => {
    const out: { paypal_order?: string; paypal_cancelled?: string } = {};
    if (typeof search["paypal_order"] === "string") out.paypal_order = search["paypal_order"];
    if (typeof search["paypal_cancelled"] === "string")
      out.paypal_cancelled = search["paypal_cancelled"];
    return out;
  },

  component: CourseDetail,
});

function CourseDetail() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();

  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const confirmed = useRef(false);

  const beginCheckout = useServerFn(startCheckout);
  const finishCheckout = useServerFn(confirmCheckout);

  const { data: course, isLoading } = useQuery(courseQuery(slug));
  const { data: lessons } = useQuery({
    ...lessonsQuery(course?.id ?? ""),
    enabled: Boolean(course?.id),
  });
  const { data: enrollments } = useQuery(enrollmentsQuery(user?.id));
  const { data: paypal } = useQuery({
    queryKey: ["paypal-configured"],
    queryFn: () => isPaypalConfigured(),
    staleTime: 5 * 60 * 1000,
  });
  const demoMode = paypal ? !paypal.configured : false;
  const enrollment = (enrollments ?? []).find((e) => e.course_id === course?.id);
  const hasAccess = Boolean(course && (!course.is_premium || enrollment?.payment_status === "paid"));
  const { data: contents } = useQuery({
    ...lessonContentQuery(course?.id ?? ""),
    enabled: Boolean(course?.id),
  });

  // Return trip from PayPal: verify the order server-side, then record enrollment.
  useEffect(() => {
    const orderId = search.paypal_order;
    if (!orderId || !course || !user || confirmed.current) return;
    confirmed.current = true;
    setBusy(true);
    finishCheckout({ data: { courseId: course.id, orderId } })
      .then(async () => {
        toast.success("Payment confirmed — course unlocked.");
        await queryClient.invalidateQueries({ queryKey: ["enrollments"] });
        await navigate({ to: "/courses/$slug", params: { slug }, search: {}, replace: true });
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "Payment could not be verified."),
      )
      .finally(() => setBusy(false));
  }, [search.paypal_order, course, user, finishCheckout, queryClient, navigate, slug]);

  useEffect(() => {
    if (search.paypal_cancelled) toast.info("Checkout cancelled.");
  }, [search.paypal_cancelled]);

  if (isLoading) {
    return <div className="container-page py-16 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!course) {
    return (
      <div className="container-page py-16">
        <h1 className="text-2xl font-semibold">Course not found</h1>
        <Button asChild className="mt-6" size="sm">
          <Link to="/courses">Back to courses</Link>
        </Button>
      </div>
    );
  }

  async function onEnrollFree() {
    if (!course) return;
    if (!user) return void navigate({ to: "/auth" });
    setBusy(true);
    try {
      await enrollFree(user.id, course.id);
      await queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      toast.success("You're enrolled.");
    } catch {
      toast.error("Could not enroll. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onBuy() {
    if (!course) return;
    if (!user) return void navigate({ to: "/auth" });
    setBusy(true);
    try {
      const { approveUrl } = await beginCheckout({
        data: { courseId: course.id, origin: window.location.origin },
      });
      window.location.href = approveUrl;
    } catch (error) {
      setBusy(false);
      toast.error(error instanceof Error ? error.message : "Could not start checkout.");
    }
  }

  return (
    <div className="container-page grid gap-10 py-14 lg:grid-cols-[1fr_20rem]">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={course.is_premium ? "default" : "secondary"}>
            {course.is_premium ? "Premium" : "Free"}
          </Badge>
          <span className="text-sm text-muted-foreground">{course.level}</span>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-3.5" aria-hidden />
            {course.duration_hours} hrs
          </span>
        </div>

        <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">{course.title}</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
          {course.description}
        </p>

        <h2 className="mt-12 text-xl font-semibold">Lessons</h2>
        <ol className="mt-4 space-y-3">
          {(lessons ?? []).map((lesson) => {
            const unlocked = hasAccess || lesson.is_preview;
            const body = contents?.[lesson.id];
            return (
              <li key={lesson.id} className="surface-panel p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {unlocked ? (
                      <PlayCircle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    ) : (
                      <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                    <div>
                      <p className="font-medium">
                        {lesson.position}. {lesson.title}
                      </p>
                      {unlocked ? (
                        body ? (
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {body}
                          </p>
                        ) : lesson.is_preview && !hasAccess ? (
                          <p className="mt-2 text-sm text-primary">Free preview</p>
                        ) : null
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Unlocks after purchase.
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {lesson.duration_minutes} min
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="surface-panel p-6">
          <p className="font-display text-3xl font-semibold">
            {course.is_premium ? formatPrice(Number(course.price_usd)) : "Free"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {course.is_premium
              ? "One-time payment. Lifetime access to every lesson."
              : "No payment required — enroll and start now."}
          </p>

          <div className="mt-6">
            {enrollment ? (
              <Button asChild className="w-full">
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            ) : course.is_premium ? (
              <Button className="w-full" onClick={onBuy} disabled={busy}>
                {busy ? "Working…" : demoMode ? "Buy now (demo checkout)" : "Buy now with PayPal"}
              </Button>
            ) : (
              <Button className="w-full" onClick={onEnrollFree} disabled={busy}>
                {busy ? "Working…" : "Enroll for free"}
              </Button>
            )}
          </div>

          {course.is_premium && demoMode && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Demo mode: checkout is simulated, no real payment is taken.
            </p>
          )}

          {!user && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              You'll be asked to sign in first.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
