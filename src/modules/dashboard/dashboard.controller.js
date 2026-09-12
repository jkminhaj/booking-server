import dashboardService from "./dashboard.service.js";
import { sendSuccess } from "../../utils/ApiResponse.js";

class DashboardController {
  async overview(req, res) {
    sendSuccess(res, await dashboardService.overview(req.user.businessId));
  }
  async today(req, res) {
    sendSuccess(res, await dashboardService.today(req.user.businessId));
  }
  async revenue(req, res) {
    sendSuccess(res, await dashboardService.revenue(req.user.businessId, req.valid.query));
  }
  async appointments(req, res) {
    sendSuccess(res, await dashboardService.appointmentStats(req.user.businessId, req.valid.query));
  }
  async customers(req, res) {
    sendSuccess(res, await dashboardService.customerStats(req.user.businessId));
  }
  async services(req, res) {
    sendSuccess(res, await dashboardService.serviceStats(req.user.businessId));
  }
  async staff(req, res) {
    sendSuccess(res, await dashboardService.staffStats(req.user.businessId));
  }
}

export default new DashboardController();
