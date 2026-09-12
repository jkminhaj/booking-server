import workingHoursService from "./working-hours.service.js";
import { sendSuccess } from "../../utils/ApiResponse.js";

class WorkingHoursController {
  async listBusinessHours(req, res) {
    sendSuccess(res, await workingHoursService.listBusinessHours(req.user.businessId));
  }
  async getForStaff(req, res) {
    sendSuccess(res, await workingHoursService.getForStaff(req.user.businessId, req.valid.params.staffId));
  }
  async create(req, res) {
    sendSuccess(res, await workingHoursService.create(req.user.businessId, req.valid.body), 201);
  }
  async update(req, res) {
    sendSuccess(res, await workingHoursService.update(req.user.businessId, req.valid.params.id, req.valid.body));
  }
  async remove(req, res) {
    await workingHoursService.remove(req.user.businessId, req.valid.params.id);
    sendSuccess(res, { message: "Working hours entry removed." });
  }
  async replaceStaffWeek(req, res) {
    const week = await workingHoursService.replaceStaffWeek(
      req.user.businessId,
      req.valid.params.staffId,
      req.valid.body.days
    );
    sendSuccess(res, week);
  }
}

export default new WorkingHoursController();
