const SANDBOX = "https://api-m.sandbox.paypal.com";
const LIVE = "https://api-m.paypal.com";

export type PaypalCreds = { clientId: string; secret: string; base: string };

export function getPaypalCreds(): PaypalCreds {
  const clientId = process.env["PAYPAL_CLIENT_ID"];
  const secret = process.env["PAYPAL_CLIENT_SECRET"];
  const env = process.env["PAYPAL_ENV"] ?? "sandbox";

  if (!clientId || !secret) {
    throw new Error(
      "PayPal is not configured yet. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to continue.",
    );
  }

  return { clientId, secret, base: env === "live" ? LIVE : SANDBOX };
}

async function accessToken({ clientId, secret, base }: PaypalCreds): Promise<string> {
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("Could not authenticate with PayPal.");
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export async function createOrder(opts: {
  amount: string;
  reference: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ orderId: string; approveUrl: string }> {
  const creds = getPaypalCreds();
  const token = await accessToken(creds);

  const res = await fetch(`${creds.base}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: opts.reference,
          description: opts.description.slice(0, 127),
          amount: { currency_code: "USD", value: opts.amount },
        },
      ],
      application_context: {
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: opts.returnUrl,
        cancel_url: opts.cancelUrl,
      },
    }),
  });

  const json = (await res.json()) as {
    id?: string;
    links?: { href: string; rel: string }[];
    message?: string;
  };
  if (!res.ok || !json.id) throw new Error(json.message ?? "PayPal order creation failed.");

  const approveUrl = json.links?.find((l) => l.rel === "approve")?.href;
  if (!approveUrl) throw new Error("PayPal did not return an approval link.");

  return { orderId: json.id, approveUrl };
}

export async function captureOrder(orderId: string): Promise<{
  completed: boolean;
  amount: number;
  referenceId: string | null;
}> {
  const creds = getPaypalCreds();
  const token = await accessToken(creds);

  const res = await fetch(`${creds.base}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  let json = (await res.json()) as PaypalOrder;

  // Already captured in a previous attempt: read the order instead.
  if (!res.ok) {
    const read = await fetch(`${creds.base}/v2/checkout/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!read.ok) throw new Error("PayPal could not verify this payment.");
    json = (await read.json()) as PaypalOrder;
  }

  const unit = json.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  const value = capture?.amount?.value ?? unit?.amount?.value ?? "0";

  return {
    completed: json.status === "COMPLETED" || capture?.status === "COMPLETED",
    amount: Number(value),
    referenceId: unit?.reference_id ?? null,
  };
}

type PaypalOrder = {
  status?: string;
  purchase_units?: {
    reference_id?: string;
    amount?: { value?: string };
    payments?: { captures?: { status?: string; amount?: { value?: string } }[] };
  }[];
};
