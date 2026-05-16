/**
 * /billing/* endpoints.
 *
 *   POST /billing/checkout       { plan: 'monthly' | 'yearly' } -> { url }
 *   POST /billing/portal                                         -> { url }
 *   GET  /billing/status                                         -> Subscription | null
 *   POST /billing/webhook        (Stripe-Signature header)       -> { received: true }
 *
 * The webhook handler must read the raw body BEFORE JSON parsing because
 * Stripe signs the byte-exact payload. The router takes care of that for us
 * (it reads the body string here, not via request.json()).
 */

import { stripeRequest, verifyStripeSignature } from "../billing/stripe";
import { requireUser } from "../auth/middleware";
import {
  findSubscriptionByStripeCustomerId,
  getSubscription,
  requireDb,
  upsertSubscription,
} from "../auth/users";
import {
  Env,
  HttpError,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../types";

interface CheckoutBody {
  plan?: "monthly" | "yearly";
}

interface StripeCheckoutSession {
  id: string;
  url: string;
  customer?: string;
  subscription?: string;
}

interface StripeCustomer {
  id: string;
}

interface StripePortalSession {
  url: string;
}

interface StripeSubscription {
  id: string;
  customer: string;
  status: SubscriptionStatus;
  current_period_end?: number;
  items?: {
    data?: Array<{
      price?: { id?: string };
    }>;
  };
}

/**
 * Dispatch a /billing/* request. Returns:
 *   - plain payload (router wraps in JSON + CORS), or
 *   - a Response (when we need to control headers, e.g. webhook 200 ack), or
 *   - `null` when the path/method is not handled.
 */
export async function dispatchBilling(
  env: Env,
  request: Request,
  url: URL
): Promise<unknown | null> {
  const path = url.pathname;

  if (path === "/billing/checkout" && request.method === "POST") {
    return handleCheckout(env, request);
  }
  if (path === "/billing/portal" && request.method === "POST") {
    return handlePortal(env, request);
  }
  if (path === "/billing/status" && request.method === "GET") {
    return handleStatus(env, request);
  }
  if (path === "/billing/webhook" && request.method === "POST") {
    return handleWebhook(env, request);
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────

async function handleCheckout(env: Env, request: Request) {
  const user = await requireUser(env, request);
  const body = (await safeJson(request)) as CheckoutBody;
  const plan: SubscriptionPlan = body.plan === "yearly" ? "yearly" : "monthly";

  const priceId =
    plan === "yearly" ? env.STRIPE_PRICE_YEARLY : env.STRIPE_PRICE_MONTHLY;
  if (!priceId) {
    throw new HttpError(
      503,
      `Stripe price id for '${plan}' is not configured (STRIPE_PRICE_${plan.toUpperCase()}).`
    );
  }

  const db = requireDb(env);
  const existing = await getSubscription(db, user.id);

  let customerId = existing?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripeRequest<StripeCustomer>(
      env.STRIPE_SECRET_KEY ?? "",
      "POST",
      "/customers",
      {
        email: user.email,
        name: user.name ?? user.email,
        metadata: { user_id: user.id },
      }
    );
    customerId = customer.id;
    await upsertSubscription(db, {
      userId: user.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: existing?.stripe_subscription_id ?? null,
      plan: existing?.plan ?? null,
      status: existing?.status ?? "incomplete",
      currentPeriodEnd: existing?.current_period_end ?? null,
    });
  }

  const appBase = (env.APP_BASE_URL ?? "").replace(/\/+$/, "") || "http://localhost:5173";
  const session = await stripeRequest<StripeCheckoutSession>(
    env.STRIPE_SECRET_KEY ?? "",
    "POST",
    "/checkout/sessions",
    {
      mode: "subscription",
      customer: customerId,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": 1,
      allow_promotion_codes: "true",
      success_url: `${appBase}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBase}/billing/cancel`,
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan } },
      client_reference_id: user.id,
    }
  );

  return { url: session.url };
}

async function handlePortal(env: Env, request: Request) {
  const user = await requireUser(env, request);
  const db = requireDb(env);
  const sub = await getSubscription(db, user.id);
  if (!sub?.stripe_customer_id) {
    throw new HttpError(400, "No Stripe customer yet. Start a checkout first.");
  }

  const appBase = (env.APP_BASE_URL ?? "").replace(/\/+$/, "") || "http://localhost:5173";
  const portal = await stripeRequest<StripePortalSession>(
    env.STRIPE_SECRET_KEY ?? "",
    "POST",
    "/billing_portal/sessions",
    {
      customer: sub.stripe_customer_id,
      return_url: `${appBase}/account`,
    }
  );

  return { url: portal.url };
}

async function handleStatus(env: Env, request: Request) {
  const user = await requireUser(env, request);
  const db = requireDb(env);
  return (await getSubscription(db, user.id)) ?? null;
}

async function handleWebhook(env: Env, request: Request): Promise<Response> {
  const payload = await request.text();
  const signature = request.headers.get("Stripe-Signature");
  await verifyStripeSignature(payload, signature, env.STRIPE_WEBHOOK_SECRET ?? "");

  type StripeEvent = {
    id: string;
    type: string;
    data: { object: Record<string, unknown> };
  };
  const event = JSON.parse(payload) as StripeEvent;
  const obj = event.data.object;

  switch (event.type) {
    case "checkout.session.completed": {
      const customer = String(obj.customer ?? "");
      const subscriptionId = String(obj.subscription ?? "");
      const userId =
        ((obj.metadata as Record<string, string> | undefined)?.user_id) ??
        ((obj.client_reference_id as string | undefined) ?? "");
      if (userId && subscriptionId) {
        const sub = await stripeRequest<StripeSubscription>(
          env.STRIPE_SECRET_KEY ?? "",
          "GET",
          `/subscriptions/${subscriptionId}`
        );
        await persistSubscription(env, userId, sub, customer);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = obj as unknown as StripeSubscription;
      const userId = await resolveUserId(env, sub);
      if (userId) {
        const status: SubscriptionStatus =
          event.type === "customer.subscription.deleted" ? "canceled" : sub.status;
        await persistSubscription(env, userId, { ...sub, status }, sub.customer);
      }
      break;
    }
    case "invoice.payment_failed": {
      const customer = String(obj.customer ?? "");
      if (customer) {
        const db = requireDb(env);
        const row = await findSubscriptionByStripeCustomerId(db, customer);
        if (row) {
          await upsertSubscription(db, {
            userId: row.user_id,
            stripeCustomerId: row.stripe_customer_id,
            stripeSubscriptionId: row.stripe_subscription_id,
            plan: row.plan,
            status: "past_due",
            currentPeriodEnd: row.current_period_end,
          });
        }
      }
      break;
    }
    case "invoice.paid": {
      const subField = obj.subscription as string | { id?: string } | null | undefined;
      const subscriptionId =
        typeof subField === "string"
          ? subField
          : subField && typeof subField === "object"
          ? subField.id ?? ""
          : "";
      const customer = String(obj.customer ?? "");
      if (subscriptionId) {
        const sub = await stripeRequest<StripeSubscription>(
          env.STRIPE_SECRET_KEY ?? "",
          "GET",
          `/subscriptions/${subscriptionId}`
        );
        const userId = await resolveUserId(env, sub);
        if (userId) {
          await persistSubscription(env, userId, sub, customer || sub.customer);
        }
      }
      break;
    }
    default:
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ─────────────────────────────────────────────────────────────────────

async function persistSubscription(
  env: Env,
  userId: string,
  sub: StripeSubscription,
  fallbackCustomer: string | null
) {
  const db = requireDb(env);
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const plan: SubscriptionPlan | null =
    priceId === env.STRIPE_PRICE_YEARLY
      ? "yearly"
      : priceId === env.STRIPE_PRICE_MONTHLY
      ? "monthly"
      : null;

  await upsertSubscription(db, {
    userId,
    stripeCustomerId: sub.customer || fallbackCustomer,
    stripeSubscriptionId: sub.id,
    plan,
    status: sub.status,
    currentPeriodEnd: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
  });
}

async function resolveUserId(
  env: Env,
  sub: StripeSubscription
): Promise<string | null> {
  // Stripe subscription metadata is the cleanest source.
  // Fallback: look up via stripe_customer_id we stored earlier.
  const meta = (sub as unknown as { metadata?: Record<string, string> }).metadata;
  if (meta?.user_id) return meta.user_id;

  if (sub.customer) {
    const db = requireDb(env);
    const row = await findSubscriptionByStripeCustomerId(db, sub.customer);
    return row?.user_id ?? null;
  }
  return null;
}

async function safeJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}
