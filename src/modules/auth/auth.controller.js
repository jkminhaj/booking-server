import authService from "./auth.service.js";
import ApiError from "../../utils/ApiError.js";
import { sendSuccess } from "../../utils/ApiResponse.js";
import { refreshCookieOptions, REFRESH_COOKIE_NAME } from "../../utils/jwt.js";

class AuthController {
  async register(req, res) {
    const { business, owner } = req.valid.body;
    const { accessToken, refreshToken, user } = await authService.register({ business, owner });
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
    sendSuccess(res, { accessToken, user }, 201);
  }

  async login(req, res) {
    const { accessToken, refreshToken, user } = await authService.login(req.valid.body);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
    sendSuccess(res, { accessToken, user });
  }

  async refresh(req, res) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) throw ApiError.unauthorized("No session found. Please log in again.");

    const { accessToken, refreshToken, user } = await authService.refresh(token);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
    sendSuccess(res, { accessToken, user });
  }

  async logout(req, res) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.logout(token);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: refreshCookieOptions().path });
    sendSuccess(res, { message: "Logged out." });
  }

  async me(req, res) {
    sendSuccess(res, await authService.me(req.user.id));
  }

  async updateProfile(req, res) {
    sendSuccess(res, await authService.updateProfile(req.user.id, req.valid.body));
  }

  async changePassword(req, res) {
    await authService.changePassword(req.user.id, req.valid.body);
    sendSuccess(res, { message: "Password changed. You've been logged out on your other devices." });
  }
}

export default new AuthController();
