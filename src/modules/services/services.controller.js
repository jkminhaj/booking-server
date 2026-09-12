import servicesService from "./services.service.js";
import { sendSuccess } from "../../utils/ApiResponse.js";

class ServicesController {
  async list(req, res) {
    const { items, total, page, limit } = await servicesService.list(req.user.businessId, req.valid.query);
    sendSuccess(res, items, 200, { page, limit, total });
  }
  async getById(req, res) {
    sendSuccess(res, await servicesService.getById(req.user.businessId, req.valid.params.id));
  }
  async create(req, res) {
    sendSuccess(res, await servicesService.create(req.user.businessId, req.valid.body), 201);
  }
  async update(req, res) {
    sendSuccess(res, await servicesService.update(req.user.businessId, req.valid.params.id, req.valid.body));
  }
  async updateStatus(req, res) {
    const service = await servicesService.updateStatus(
      req.user.businessId,
      req.valid.params.id,
      req.valid.body.isActive
    );
    sendSuccess(res, service);
  }
  async remove(req, res) {
    await servicesService.remove(req.user.businessId, req.valid.params.id);
    sendSuccess(res, { message: "Service removed." });
  }
  async getStaff(req, res) {
    sendSuccess(res, await servicesService.getStaff(req.user.businessId, req.valid.params.id));
  }
  async replaceStaff(req, res) {
    const staff = await servicesService.replaceStaff(
      req.user.businessId,
      req.valid.params.id,
      req.valid.body.staffIds
    );
    sendSuccess(res, staff);
  }
}

export default new ServicesController();
