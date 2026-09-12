import businessService from "./business.service.js";
import { sendSuccess } from "../../utils/ApiResponse.js";

class BusinessController {
  async getCurrent(req, res) {
    sendSuccess(res, await businessService.getCurrent(req.user.businessId));
  }

  async update(req, res) {
    sendSuccess(res, await businessService.update(req.user.businessId, req.valid.body));
  }

  async updateStatus(req, res) {
    const business = await businessService.updateStatus(req.user.businessId, req.valid.body.isActive);
    sendSuccess(res, business);
  }
}

export default new BusinessController();
