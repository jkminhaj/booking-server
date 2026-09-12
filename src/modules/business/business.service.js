import prisma from "../../config/prisma.js";
import ApiError from "../../utils/ApiError.js";

class BusinessService {
  async getCurrent(businessId) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw ApiError.notFound("Business not found.");
    return business;
  }

  async update(businessId, updates) {
    return prisma.business.update({ where: { id: businessId }, data: updates });
  }

  async updateStatus(businessId, isActive) {
    return prisma.business.update({ where: { id: businessId }, data: { isActive } });
  }
}

export default new BusinessService();
