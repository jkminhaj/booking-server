import Stripe from "stripe";
import paymentsService from "./payments.service.js";
import { sendSuccess } from "../../utils/ApiResponse.js";
import ApiError from "../../utils/ApiError.js";
import { env } from "../../config/env.js";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

class PaymentsController {
  async list(req, res) {
    const { items, total, page, limit } = await paymentsService.list(req.user.businessId, req.valid.query);
    sendSuccess(res, items, 200, { page, limit, total });
  }

  async getById(req, res) {
    sendSuccess(res, await paymentsService.getById(req.user.businessId, req.valid.params.id));
  }

  async getByAppointment(req, res) {
    sendSuccess(
      res,
      await paymentsService.getByAppointment(req.user.businessId, req.valid.params.appointmentId)
    );
  }

  async create(req, res) {
    sendSuccess(res, await paymentsService.create(req.user.businessId, req.valid.body), 201);
  }

  async update(req, res) {
    sendSuccess(res, await paymentsService.update(req.user.businessId, req.valid.params.id, req.valid.body));
  }

  async refund(req, res) {
    sendSuccess(res, await paymentsService.refund(req.user.businessId, req.valid.params.id, req.valid.body));
  }

  /** Public: called from the booking page right before the customer enters
   * card details, immediately after the (unpaid) appointment is created. */
  async createIntent(req, res) {
    sendSuccess(res, await paymentsService.createIntent(req.valid.body.appointmentId), 201);
  }

  /**
   * Stripe webhook. app.js registers this route with express.raw() BEFORE
   * the global express.json() middleware — req.body here must be the raw
   * request bytes, or signature verification below will always fail.
   * This is the ONLY place a card payment is ever marked PAID.
   */
  async handleWebhook(req, res) {
    const signature = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      throw ApiError.badRequest(`Webhook signature verification failed: ${err.message}`);
    }

    await paymentsService.handleWebhookEvent(event);
    res.json({ received: true });
  }
}

export default new PaymentsController();
