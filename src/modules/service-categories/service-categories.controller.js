import categoriesService from "./service-categories.service.js";
import { sendSuccess } from "../../utils/ApiResponse.js";

class ServiceCategoriesController {
  async list(req, res) {
    const { items, total, page, limit } = await categoriesService.list(req.user.businessId, req.valid.query);
    sendSuccess(res, items, 200, { page, limit, total });
  }
  async getById(req, res) {
    sendSuccess(res, await categoriesService.getById(req.user.businessId, req.valid.params.id));
  }
  async create(req, res) {
    sendSuccess(res, await categoriesService.create(req.user.businessId, req.valid.body), 201);
  }
  async update(req, res) {
    sendSuccess(res, await categoriesService.update(req.user.businessId, req.valid.params.id, req.valid.body));
  }
  async updateStatus(req, res) {
    const category = await categoriesService.updateStatus(
      req.user.businessId,
      req.valid.params.id,
      req.valid.body.isActive
    );
    sendSuccess(res, category);
  }
  async remove(req, res) {
    await categoriesService.remove(req.user.businessId, req.valid.params.id);
    sendSuccess(res, { message: "Category removed." });
  }
  async getServices(req, res) {
    sendSuccess(res, await categoriesService.getServices(req.user.businessId, req.valid.params.id));
  }
}

export default new ServiceCategoriesController();
