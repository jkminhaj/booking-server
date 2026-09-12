import publicService from "./public.service.js";
import { sendSuccess } from "../../utils/ApiResponse.js";

class PublicController {
  async getBusiness(req, res) {
    sendSuccess(res, publicService.toPublicBusiness(req.business));
  }

  async getCategories(req, res) {
    sendSuccess(res, await publicService.getCategories(req.business.id));
  }

  async getServices(req, res) {
    sendSuccess(res, await publicService.getServices(req.business.id, req.valid.query.categoryId));
  }

  async getStaff(req, res) {
    sendSuccess(res, await publicService.getStaff(req.business.id, req.valid.query.serviceId));
  }

  async getAvailability(req, res) {
    sendSuccess(res, await publicService.getAvailability(req.business.id, req.valid.query));
  }

  async createAppointment(req, res) {
    sendSuccess(res, await publicService.createAppointment(req.business.id, req.valid.body), 201);
  }
}

export default new PublicController();
