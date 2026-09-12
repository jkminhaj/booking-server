import prisma, { AppointmentStatus, PaymentStatus } from "../../config/prisma.js";
import { getUtcDayBounds, getTodayInTimezone } from "../availability/availability.helpers.js";

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

class DashboardService {
  async overview(businessId) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    const { dayStartUtc, dayEndUtc } = getUtcDayBounds(getTodayInTimezone(business.timezone), business.timezone);
    const todayWhere = { businessId, startAt: { gte: dayStartUtc, lt: dayEndUtc } };

    const [todayAppointments, completedAppointments, pendingAppointments, revenueToday, totalCustomers] =
      await Promise.all([
        prisma.appointment.count({ where: todayWhere }),
        prisma.appointment.count({ where: { ...todayWhere, status: AppointmentStatus.COMPLETED } }),
        prisma.appointment.count({ where: { ...todayWhere, status: AppointmentStatus.PENDING } }),
        prisma.payment.aggregate({
          where: { status: PaymentStatus.PAID, paidAt: { gte: dayStartUtc, lt: dayEndUtc }, appointment: { businessId } },
          _sum: { amount: true },
        }),
        prisma.customer.count({ where: { businessId } }),
      ]);

    return {
      todayAppointments,
      completedAppointments,
      pendingAppointments,
      revenueToday: revenueToday._sum.amount ?? 0,
      totalCustomers,
    };
  }

  async today(businessId) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    const { dayStartUtc, dayEndUtc } = getUtcDayBounds(getTodayInTimezone(business.timezone), business.timezone);
    return prisma.appointment.findMany({
      where: { businessId, startAt: { gte: dayStartUtc, lt: dayEndUtc } },
      orderBy: { startAt: "asc" },
      include: { customer: true, staff: { select: { id: true, name: true } }, service: true },
    });
  }

  async revenue(businessId, { from, to }) {
    const where = {
      status: PaymentStatus.PAID,
      appointment: { businessId },
      ...(from || to
        ? { paidAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {}),
    };
    const result = await prisma.payment.aggregate({ where, _sum: { amount: true }, _count: true });
    return { totalRevenue: result._sum.amount ?? 0, paymentCount: result._count };
  }

  async appointmentStats(businessId, { from, to }) {
    const where = {
      businessId,
      ...(from || to
        ? { startAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {}),
    };
    const grouped = await prisma.appointment.groupBy({ by: ["status"], where, _count: true });
    return {
      total: grouped.reduce((sum, g) => sum + g._count, 0),
      byStatus: Object.fromEntries(grouped.map((g) => [g.status, g._count])),
    };
  }

  async customerStats(businessId) {
    const [total, newLast30Days] = await Promise.all([
      prisma.customer.count({ where: { businessId } }),
      prisma.customer.count({ where: { businessId, createdAt: { gte: daysAgo(30) } } }),
    ]);
    return { total, newLast30Days };
  }

  async serviceStats(businessId) {
    const grouped = await prisma.appointment.groupBy({
      by: ["serviceId"],
      where: { businessId, status: AppointmentStatus.COMPLETED },
      _count: true,
    });
    const services = await prisma.service.findMany({ where: { id: { in: grouped.map((g) => g.serviceId) } } });
    const byId = Object.fromEntries(services.map((s) => [s.id, s]));
    return grouped
      .map((g) => ({ service: byId[g.serviceId], completedCount: g._count }))
      .sort((a, b) => b.completedCount - a.completedCount);
  }

  async staffStats(businessId) {
    const grouped = await prisma.appointment.groupBy({
      by: ["staffId"],
      where: { businessId, status: AppointmentStatus.COMPLETED },
      _count: true,
    });
    const staff = await prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.staffId) } },
      select: { id: true, name: true },
    });
    const byId = Object.fromEntries(staff.map((s) => [s.id, s]));
    return grouped
      .map((g) => ({ staff: byId[g.staffId], completedCount: g._count }))
      .sort((a, b) => b.completedCount - a.completedCount);
  }
}

export default new DashboardService();
