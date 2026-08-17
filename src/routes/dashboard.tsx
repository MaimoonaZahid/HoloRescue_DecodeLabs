import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { coursesQuery, enrollmentsQuery, formatPrice } from "@/lib/lms";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Student dashboard — Emerald LMS" },
      {
        name: "description",
        content: "Track your enrolled courses, payment status and PayPal receipts.",
      },
      { property: "og:title", content: "Student dashboard — Emerald LMS" },
      {
        property: "og:description",
        content: "Your enrolled courses and payment history on Emerald LMS.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: courses } = useQuery(coursesQuery);
  const { data: enrollments, isLoading } = useQuery(enrollmentsQuery(user?.id));

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div className="container-page py-16 text-sm text-muted-foreground">Loading…</div>;
  }

  const byId = new Map((courses ?? []).map((c) => [c.id, c]));
  const rows = enrollments ?? [];
  const paidTotal = rows.reduce((sum, r) => sum + Number(r.amount_paid), 0);

  return (
    <div className="container-page py-14">
      <h1 className="text-3xl font-semibold">Your dashboard</h1>
      <p className="mt-3 text-sm text-muted-foreground">Signed in as {user.email}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Enrolled courses" value={String(rows.length)} />
        <Stat
          label="Premium unlocked"
          value={String(rows.filter((r) => r.payment_status === "paid").length)}
        />
        <Stat label="Total paid" value={formatPrice(paidTotal)} />
      </div>

      <h2 className="mt-12 text-xl font-semibold">Enrollments</h2>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading enrollments…</p>
      ) : rows.length === 0 ? (
        <div className="surface-panel mt-4 flex flex-col items-start gap-4 p-8">
          <p className="text-sm text-muted-foreground">
            You haven't enrolled in anything yet. Free courses open immediately.
          </p>
          <Button asChild size="sm">
            <Link to="/courses">Browse courses</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => {
            const course = byId.get(row.course_id);
            return (
              <li
                key={row.id}
                className="surface-panel flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div className="min-w-0">
                  <p className="font-medium">{course?.title ?? "Course"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enrolled {new Date(row.created_at).toLocaleDateString()}
                    {row.paypal_order_id ? ` · PayPal ${row.paypal_order_id}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={row.payment_status === "paid" ? "default" : "secondary"}>
                    {row.payment_status === "paid"
                      ? `Paid ${formatPrice(Number(row.amount_paid))}`
                      : "Free access"}
                  </Badge>
                  {course && (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/courses/$slug" params={{ slug: course.slug }}>
                        Open
                      </Link>
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-panel p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
