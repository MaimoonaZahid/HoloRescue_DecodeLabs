import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/CourseCard";
import { coursesQuery } from "@/lib/lms";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Emerald LMS — Engineering courses, free and premium" },
      {
        name: "description",
        content:
          "Learn web, backend and UX engineering. Start free, unlock premium courses with secure PayPal checkout.",
      },
      { property: "og:title", content: "Emerald LMS — Engineering courses" },
      {
        property: "og:description",
        content: "Free and premium engineering courses with secure PayPal checkout.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: courses } = useQuery(coursesQuery);
  const featured = (courses ?? []).slice(0, 3);

  return (
    <>
      <section className="emerald-glow border-b border-border">
        <div className="container-page py-20 text-center sm:py-28">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            Learn by building
          </p>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            Engineering courses that respect your time
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Short, dense lessons on the web, backend systems and interface craft. Start free —
            unlock premium tracks whenever you're ready.
          </p>
          <div className="mt-9">
            <Button asChild size="lg">
              <Link to="/courses">
                Browse courses
                <ArrowRight className="ml-1 size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container-page grid gap-8 py-14 sm:grid-cols-3">
          <Feature
            icon={<Sparkles className="size-5 text-primary" aria-hidden />}
            title="Free to start"
            body="Three complete tracks are free forever, with no card required."
          />
          <Feature
            icon={<Wallet className="size-5 text-primary" aria-hidden />}
            title="Pay once per course"
            body="No subscription. Buy the premium course you want and keep it."
          />
          <Feature
            icon={<ShieldCheck className="size-5 text-primary" aria-hidden />}
            title="Secure checkout"
            body="Payments are created and verified server-side through PayPal."
          />
        </div>
      </section>

      <section className="container-page py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold">Popular right now</h2>
          <Link to="/courses" className="text-sm text-primary hover:underline">
            All courses
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>
    </>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="space-y-2">
      {icon}
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
