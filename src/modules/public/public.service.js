import prisma from "../../config/prisma.js";
import availabilityService from "../availability/availability.service.js";
import appointmentsService from "../appointments/appointments.service.js";

class PublicService {
  /** Only what a customer needs to see — never the internal isActive flag etc. */
  toPublicBusiness(business) {
    return {
      id: business.id,
      name: business.name,
      slug: business.slug,
      timezone: business.timezone,
      email: business.email,
      phone: business.phone,
    };
  }

  async getCategories(businessId) {
    return prisma.serviceCategory.findMany({ where: { businessId, isActive: true }, orderBy: { name: "asc" } });
  }

  async getServices(businessId, categoryId) {
    return prisma.service.findMany({
      where: { businessId, isActive: true, ...(categoryId ? { categoryId } : {}) },
      orderBy: { name: "asc" },
    });
  }

  async getStaff(businessId, serviceId) {
    return prisma.user.findMany({
      where: {
        businessId,
        isActive: true,
        ...(serviceId ? { staffServices: { some: { serviceId, isActive: true } } } : {}),
      },
      select: { id: true, name: true, image: true },
    });
  }

  async getAvailability(businessId, { serviceId, date, staffId }) {
    return availabilityService.getAvailability({ businessId, serviceId, date, staffId });
  }

  /**
   * Public booking: finds-or-creates the customer by email within this
   * business, then hands off to the SAME appointments service the
   * authenticated dashboard uses — so a public booking gets exactly the
   * same double-booking protection and working-hours validation as one
   * created by staff (spec §25/§47: never trust a prior availability
   * check, always re-verify at creation time).
   */
  async createAppointment(businessId, input) {
    const customer = await this.#findOrCreateCustomer(businessId, input.customer);

    return appointmentsService.create(businessId, {
      customerId: customer.id,
      staffId: input.staffId,
      serviceId: input.serviceId,
      startAt: input.startAt,
      notes: input.notes,
    });
  }

  async #findOrCreateCustomer(businessId, contact) {
    if (contact.email) {
      const existing = await prisma.customer.findUnique({
        where: { businessId_email: { businessId, email: contact.email } },
      });
      if (existing) return existing;
    }

    return prisma.customer.create({
      data: { businessId, name: contact.name, email: contact.email, phone: contact.phone },
    });
  }
}

export default new PublicService();
