import usersService from "./users.service.js";
import { sendSuccess } from "../../utils/ApiResponse.js";

class UsersController {
  async list(req, res) {
    const { items, total, page, limit } = await usersService.list(req.user.businessId, req.valid.query);
    sendSuccess(res, items, 200, { page, limit, total });
  }

  async getById(req, res) {
    sendSuccess(res, await usersService.getById(req.user.businessId, req.valid.params.id));
  }

  async create(req, res) {
    sendSuccess(res, await usersService.create(req.user.businessId, req.valid.body), 201);
  }

  async update(req, res) {
    sendSuccess(res, await usersService.update(req.user.businessId, req.valid.params.id, req.valid.body));
  }

  async updateRole(req, res) {
    const user = await usersService.updateRole(req.user.businessId, req.valid.params.id, req.valid.body.role);
    sendSuccess(res, user);
  }

  async updateStatus(req, res) {
    const user = await usersService.updateStatus(
      req.user.businessId,
      req.valid.params.id,
      req.valid.body.isActive
    );
    sendSuccess(res, user);
  }

  async remove(req, res) {
    await usersService.remove(req.user.businessId, req.valid.params.id);
    sendSuccess(res, { message: "Staff member removed." });
  }

  async getServices(req, res) {
    sendSuccess(res, await usersService.getServices(req.user.businessId, req.valid.params.id));
  }

  async replaceServices(req, res) {
    const services = await usersService.replaceServices(
      req.user.businessId,
      req.valid.params.id,
      req.valid.body.serviceIds
    );
    sendSuccess(res, services);
  }
}

export default new UsersController();
