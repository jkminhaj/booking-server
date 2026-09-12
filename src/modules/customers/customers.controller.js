import customersService from "./customers.service.js";
import { sendSuccess } from "../../utils/ApiResponse.js";

class CustomersController {
  async list(req, res) {
    const { items, total, page, limit } = await customersService.list(req.user.businessId, req.valid.query);
    sendSuccess(res, items, 200, { page, limit, total });
  }

  async search(req, res) {
    sendSuccess(res, await customersService.search(req.user.businessId, req.valid.query.q));
  }

  async getById(req, res) {
    sendSuccess(res, await customersService.getById(req.user.businessId, req.valid.params.id));
  }

  async create(req, res) {
    sendSuccess(res, await customersService.create(req.user.businessId, req.valid.body), 201);
  }

  async update(req, res) {
    sendSuccess(res, await customersService.update(req.user.businessId, req.valid.params.id, req.valid.body));
  }

  async remove(req, res) {
    await customersService.remove(req.user.businessId, req.valid.params.id);
    sendSuccess(res, { message: "Customer removed." });
  }

  async getAppointments(req, res) {
    const { items, total, page, limit } = await customersService.getAppointments(
      req.user.businessId,
      req.valid.params.id,
      req.valid.query
    );
    sendSuccess(res, items, 200, { page, limit, total });
  }
}

export default new CustomersController();
