import appointmentsService from "./appointments.service.js";
import { sendSuccess } from "../../utils/ApiResponse.js";
import ApiError from "../../utils/ApiError.js";

// STAFF can only ever see their own schedule (spec §43) — everyone else
// with read access can see the whole business's appointments.
function scopeToOwnStaffIfNeeded(req, filters) {
  if (req.user.role === "STAFF") return { ...filters, staffId: req.user.id };
  return filters;
}

class AppointmentsController {
  async list(req, res) {
    const filters = scopeToOwnStaffIfNeeded(req, req.valid.query);
    const { items, total, page, limit } = await appointmentsService.list(req.user.businessId, filters);
    sendSuccess(res, items, 200, { page, limit, total });
  }

  async getById(req, res) {
    const appointment = await appointmentsService.getById(req.user.businessId, req.valid.params.id);
    if (req.user.role === "STAFF" && appointment.staffId !== req.user.id) throw ApiError.forbidden();
    sendSuccess(res, appointment);
  }

  async getPayments(req, res) {
    sendSuccess(res, await appointmentsService.getPayments(req.user.businessId, req.valid.params.id));
  }

  async getByDate(req, res) {
    const filters = scopeToOwnStaffIfNeeded(req, { ...req.valid.query, date: req.valid.params.date });
    const { items, total, page, limit } = await appointmentsService.list(req.user.businessId, filters);
    sendSuccess(res, items, 200, { page, limit, total });
  }

  async getByStaff(req, res) {
    if (req.user.role === "STAFF" && req.valid.params.staffId !== req.user.id) throw ApiError.forbidden();
    const { items, total, page, limit } = await appointmentsService.list(req.user.businessId, {
      ...req.valid.query,
      staffId: req.valid.params.staffId,
    });
    sendSuccess(res, items, 200, { page, limit, total });
  }

  async getByCustomer(req, res) {
    const filters = scopeToOwnStaffIfNeeded(req, { ...req.valid.query, customerId: req.valid.params.customerId });
    const { items, total, page, limit } = await appointmentsService.list(req.user.businessId, filters);
    sendSuccess(res, items, 200, { page, limit, total });
  }

  async create(req, res) {
    sendSuccess(res, await appointmentsService.create(req.user.businessId, req.valid.body), 201);
  }

  async update(req, res) {
    sendSuccess(res, await appointmentsService.update(req.user.businessId, req.valid.params.id, req.valid.body));
  }

  async remove(req, res) {
    await appointmentsService.remove(req.user.businessId, req.valid.params.id);
    sendSuccess(res, { message: "Appointment removed." });
  }

  async updateStatus(req, res) {
    const appointment = await appointmentsService.transitionStatus(
      req.user.businessId,
      req.valid.params.id,
      req.valid.body.status
    );
    sendSuccess(res, appointment);
  }

  async cancel(req, res) {
    const appointment = await appointmentsService.transitionStatus(
      req.user.businessId,
      req.valid.params.id,
      "CANCELLED",
      { reason: req.valid.body?.reason }
    );
    sendSuccess(res, appointment);
  }

  async confirm(req, res) {
    sendSuccess(res, await appointmentsService.transitionStatus(req.user.businessId, req.valid.params.id, "CONFIRMED"));
  }

  async complete(req, res) {
    sendSuccess(res, await appointmentsService.transitionStatus(req.user.businessId, req.valid.params.id, "COMPLETED"));
  }

  async noShow(req, res) {
    sendSuccess(res, await appointmentsService.transitionStatus(req.user.businessId, req.valid.params.id, "NO_SHOW"));
  }
}

export default new AppointmentsController();
