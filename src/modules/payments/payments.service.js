import Stripe from "stripe";
import prisma, { PaymentStatus, PaymentMethod, AppointmentStatus } from "../../config/prisma.js";
import ApiError from "../../utils/ApiError.js";
import { env } from "../../config/env.js";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

function mapRefundReason(reason) {
  const allowed = ["duplicate", "fraudulent", "requested_by_customer"];
  return allowed.includes(reason) ? reason : "requested_by_customer";
}

class PaymentsService {
  async list(businessId, { page, limit, status }) {
    const where = { appointment: { businessId }, ...(status ? { status } : {}) };
    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { appointment: true },
      }),
      prisma.payment.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getById(businessId, id) {
    return this.#assertExists(businessId, id);
  }

  async getByAppointment(businessId, appointmentId) {
    await this.#assertAppointmentBelongs(businessId, appointmentId);
    return prisma.payment.findMany({ where: { appointmentId }, orderBy: { createdAt: "desc" } });
  }

  /** Manual payment record — typically CASH taken in person. CARD payments
   * normally arrive via the Stripe webhook instead (see handleWebhookEvent). */
  async create(businessId, data) {
    await this.#assertAppointmentBelongs(businessId, data.appointmentId);
    const isCash = data.method === PaymentMethod.CASH;
    return prisma.payment.create({
      data: {
        appointmentId: data.appointmentId,
        amount: data.amount,
        method: data.method,
        transactionRef: data.transactionRef,
        status: isCash ? PaymentStatus.PAID : PaymentStatus.PENDING,
        paidAt: isCash ? new Date() : null,
      },
    });
  }

  async update(businessId, id, updates) {
    const payment = await this.#assertExists(businessId, id);
    if (payment.method === PaymentMethod.CARD && updates.status) {
      throw ApiError.badRequest(
        "Card payment status is driven by Stripe automatically — use the refund endpoint instead."
      );
    }
    return prisma.payment.update({ where: { id }, data: updates });
  }

  async refund(businessId, id, { amount, reason }) {
    const payment = await this.#assertExists(businessId, id);
    if (![PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED].includes(payment.status)) {
      throw ApiError.badRequest("Only a paid payment can be refunded.");
    }

    if (payment.method === PaymentMethod.CARD) {
      if (!payment.transactionRef) throw ApiError.badRequest("This payment has no Stripe reference to refund.");
      await stripe.refunds.create({
        payment_intent: payment.transactionRef,
        ...(amount ? { amount: Math.round(amount * 100) } : {}),
        ...(reason ? { reason: mapRefundReason(reason) } : {}),
      });
    }

    const isFullRefund = !amount || Number(amount) >= Number(payment.amount);
    return prisma.payment.update({
      where: { id },
      data: { status: isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED },
    });
  }

  /** No JWT here on purpose — the customer paying has no staff account.
   * Only works against a real, still-unpaid appointmentId, and is
   * rate-limited (see rateLimiters.publicBookingLimiter). */
  async createIntent(appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { payments: true },
    });
    if (!appointment) throw ApiError.notFound("Appointment not found.");
    if (appointment.payments.some((p) => p.status === PaymentStatus.PAID)) {
      throw ApiError.conflict("This appointment has already been paid.");
    }

    const amountInMinorUnits = Math.round(Number(appointment.priceAtBooking) * 100);
    const intent = await stripe.paymentIntents.create({
      amount: amountInMinorUnits,
      currency: env.DEFAULT_CURRENCY,
      metadata: { appointmentId: appointment.id, businessId: appointment.businessId },
    });

    await prisma.payment.create({
      data: {
        appointmentId: appointment.id,
        amount: appointment.priceAtBooking,
        method: PaymentMethod.CARD,
        status: PaymentStatus.PENDING,
        transactionRef: intent.id,
      },
    });

    return { clientSecret: intent.client_secret };
  }

  /** Called only after the webhook signature has already been verified in
   * the controller — everything here trusts `event` completely. */
  async handleWebhookEvent(event) {
    switch (event.type) {
      case "payment_intent.succeeded":
        await this.#markPaidByIntentId(event.data.object.id);
        break;
      case "payment_intent.payment_failed":
        await this.#markFailedByIntentId(event.data.object.id);
        break;
      default:
        break; // not a type this app acts on
    }
  }

  /** Idempotent: Stripe may deliver the same event more than once. */
  async #markPaidByIntentId(paymentIntentId) {
    const payment = await prisma.payment.findFirst({ where: { transactionRef: paymentIntentId } });
    if (!payment || payment.status === PaymentStatus.PAID) return;

    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.PAID, paidAt: new Date() } }),
      prisma.appointment.updateMany({
        where: { id: payment.appointmentId, status: AppointmentStatus.PENDING },
        data: { status: AppointmentStatus.CONFIRMED },
      }),
    ]);
  }

  async #markFailedByIntentId(paymentIntentId) {
    const payment = await prisma.payment.findFirst({ where: { transactionRef: paymentIntentId } });
    if (!payment || payment.status === PaymentStatus.PAID) return;
    await prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED } });
  }

  async #assertExists(businessId, id) {
    const payment = await prisma.payment.findFirst({
      where: { id, appointment: { businessId } },
      include: { appointment: true },
    });
    if (!payment) throw ApiError.notFound("Payment not found.");
    return payment;
  }

  async #assertAppointmentBelongs(businessId, appointmentId) {
    const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, businessId } });
    if (!appointment) throw ApiError.badRequest("Appointment does not belong to this business.");
    return appointment;
  }
}

export default new PaymentsService();
