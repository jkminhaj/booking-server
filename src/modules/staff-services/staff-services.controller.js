import staffServicesService from "./staff-services.service.js";
import { sendSuccess } from "../../utils/ApiResponse.js";

class StaffServicesController {
  async list(req, res) {
    const { items, total, page, limit } = await staffServicesService.list(req.user.businessId, req.valid.query);
    sendSuccess(res, items, 200, { page, limit, total });
  }
  async getById(req, res) {
    sendSuccess(res, await staffServicesService.getById(req.user.businessId, req.valid.params.id));
  }
  async create(req, res) {
    sendSuccess(res, await staffServicesService.create(req.user.businessId, req.valid.body), 201);
  }
  async update(req, res) {
    sendSuccess(
      res,
      await staffServicesService.update(req.user.businessId, req.valid.params.id, req.valid.body)
    );
  }
  async remove(req, res) {
    await staffServicesService.remove(req.user.businessId, req.valid.params.id);
    sendSuccess(res, { message: "Assignment removed." });
  }
}

export default new StaffServicesController();
