import overridesService from "./schedule-overrides.service.js";
import { sendSuccess } from "../../utils/ApiResponse.js";

class ScheduleOverridesController {
  async list(req, res) {
    sendSuccess(res, await overridesService.list(req.user.businessId, req.valid.query.staffId));
  }
  async getByDate(req, res) {
    const overrides = await overridesService.getByDate(
      req.user.businessId,
      req.valid.params.date,
      req.valid.query.staffId
    );
    sendSuccess(res, overrides);
  }
  async getById(req, res) {
    sendSuccess(res, await overridesService.getById(req.user.businessId, req.valid.params.id));
  }
  async create(req, res) {
    sendSuccess(res, await overridesService.create(req.user.businessId, req.valid.body), 201);
  }
  async update(req, res) {
    sendSuccess(res, await overridesService.update(req.user.businessId, req.valid.params.id, req.valid.body));
  }
  async remove(req, res) {
    await overridesService.remove(req.user.businessId, req.valid.params.id);
    sendSuccess(res, { message: "Schedule override removed." });
  }
}

export default new ScheduleOverridesController();
