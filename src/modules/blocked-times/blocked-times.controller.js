import blockedTimesService from "./blocked-times.service.js";
import { sendSuccess } from "../../utils/ApiResponse.js";

class BlockedTimesController {
  async list(req, res) {
    sendSuccess(res, await blockedTimesService.list(req.user.businessId, req.valid.query));
  }
  async getForStaff(req, res) {
    sendSuccess(res, await blockedTimesService.getForStaff(req.user.businessId, req.valid.params.staffId));
  }
  async getById(req, res) {
    sendSuccess(res, await blockedTimesService.getById(req.user.businessId, req.valid.params.id));
  }
  async create(req, res) {
    sendSuccess(res, await blockedTimesService.create(req.user.businessId, req.valid.body), 201);
  }
  async update(req, res) {
    sendSuccess(res, await blockedTimesService.update(req.user.businessId, req.valid.params.id, req.valid.body));
  }
  async remove(req, res) {
    await blockedTimesService.remove(req.user.businessId, req.valid.params.id);
    sendSuccess(res, { message: "Blocked time removed." });
  }
}

export default new BlockedTimesController();
