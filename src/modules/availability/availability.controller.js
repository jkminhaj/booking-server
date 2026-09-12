import availabilityService from "./availability.service.js";
import { sendSuccess } from "../../utils/ApiResponse.js";

class AvailabilityController {
  async get(req, res) {
    const { serviceId, date, staffId } = req.valid.query;
    sendSuccess(
      res,
      await availabilityService.getAvailability({ businessId: req.user.businessId, serviceId, date, staffId })
    );
  }

  async getForStaff(req, res) {
    const { serviceId, date } = req.valid.query;
    sendSuccess(
      res,
      await availabilityService.getAvailability({
        businessId: req.user.businessId,
        serviceId,
        date,
        staffId: req.valid.params.staffId,
      })
    );
  }

  async getForService(req, res) {
    const { date, staffId } = req.valid.query;
    sendSuccess(
      res,
      await availabilityService.getAvailability({
        businessId: req.user.businessId,
        serviceId: req.valid.params.serviceId,
        date,
        staffId,
      })
    );
  }
}

export default new AvailabilityController();
