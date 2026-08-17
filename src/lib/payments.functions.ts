import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const isPaypalConfigured = createServerFn({ method: "GET" }).handler(async () => {
  return {
    configured: Boolean(
      process.env["PAYPAL_CLIENT_ID"] && process.env["PAYPAL_CLIENT_SECRET"],
    ),
    env: process.env["PAYPAL_ENV"] ?? "sandbox",
  };
});

const paypalConfigured = () =>
  Boolean(process.env["PAYPAL_CLIENT_ID"] && process.env["PAYPAL_CLIENT_SECRET"]);

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { courseId: string; origin: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: course, error } = await context.supabase
      .from("courses")
      .select("id, slug, title, price_usd, is_premium")
      .eq("id", data.courseId)
      .maybeSingle();

    if (error || !course) throw new Error("Course not found.");
    if (!course.is_premium) throw new Error("This course is free — no payment needed.");

    const origin = data.origin.replace(/\/$/, "");
    const returnUrl = `${origin}/courses/${course.slug}?paypal_order={ORDER_ID}`;
    const cancelUrl = `${origin}/courses/${course.slug}?paypal_cancelled=1`;

    // Demo mode: no PayPal credentials configured, so run a simulated checkout
    // against an in-app sandbox page instead of the real PayPal flow.
    if (!paypalConfigured()) {
      const orderId = `DEMO-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      const params = new URLSearchParams({
        order: orderId,
        title: course.title,
        amount: Number(course.price_usd).toFixed(2),
        return: returnUrl.replace("{ORDER_ID}", orderId),
        cancel: cancelUrl,
      });
      return { orderId, approveUrl: `${origin}/checkout/demo?${params.toString()}`, demo: true };
    }

    const { createOrder } = await import("./paypal.server");
    const { orderId, approveUrl } = await createOrder({
      amount: Number(course.price_usd).toFixed(2),
      reference: course.id,
      description: course.title,
      returnUrl,
      cancelUrl,
    });

    return { orderId, approveUrl, demo: false };
  });

export const confirmCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { courseId: string; orderId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: course, error } = await context.supabase
      .from("courses")
      .select("id, price_usd, is_premium")
      .eq("id", data.courseId)
      .maybeSingle();

    if (error || !course) throw new Error("Course not found.");

    const isDemo = data.orderId.startsWith("DEMO-");
    if (isDemo && paypalConfigured()) {
      throw new Error("Demo payments are disabled once PayPal is configured.");
    }

    let amount = Number(course.price_usd);

    if (!isDemo) {
      const { captureOrder } = await import("./paypal.server");
      const result = await captureOrder(data.orderId);
      if (!result.completed) throw new Error("Payment was not completed.");
      if (result.referenceId && result.referenceId !== course.id) {
        throw new Error("This payment does not belong to this course.");
      }
      if (result.amount + 0.001 < Number(course.price_usd)) {
        throw new Error("Paid amount does not match the course price.");
      }
      amount = result.amount;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upsertError } = await supabaseAdmin.from("enrollments").upsert(
      {
        user_id: context.userId,
        course_id: course.id,
        payment_status: "paid",
        amount_paid: amount,
        paypal_order_id: data.orderId,
      },
      { onConflict: "user_id,course_id" },
    );

    if (upsertError) throw new Error("Payment captured but enrollment could not be saved.");

    return { ok: true as const, demo: isDemo };
  });

