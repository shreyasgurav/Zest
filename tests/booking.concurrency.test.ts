import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createBooking, InsufficientCapacityError } from '@/domains/bookings/services/booking.service';

const prisma = new PrismaClient();

// Shared fixtures created per test.
let eventId: string;
let sessionId: string;
let generalTypeId: string;
let userIds: string[] = [];

async function resetData() {
  await prisma.entryLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.session.deleteMany();
  await prisma.event.deleteMany();
  await prisma.handle.deleteMany();
  await prisma.page.deleteMany();
  await prisma.user.deleteMany();
}

async function seedFixture(capacity: number) {
  const organizer = await prisma.user.create({
    data: { email: 'org@test.dev', name: 'Org' },
  });

  const event = await prisma.event.create({
    data: {
      title: 'Concurrency Test Event',
      ownerId: organizer.id,
      sessions: {
        create: {
          name: 'S1',
          date: new Date('2026-02-01'),
          startTime: '10:00',
          endTime: '12:00',
          ticketTypes: { create: [{ name: 'General', price: 100, capacity }] },
        },
      },
    },
    include: { sessions: { include: { ticketTypes: true } } },
  });

  eventId = event.id;
  sessionId = event.sessions[0].id;
  generalTypeId = event.sessions[0].ticketTypes[0].id;

  // Create a pool of buyers.
  userIds = [];
  for (let i = 0; i < 50; i++) {
    const u = await prisma.user.create({
      data: { email: `buyer${i}@test.dev`, name: `Buyer ${i}` },
    });
    userIds.push(u.id);
  }
}

function bookOne(userId: string) {
  return createBooking({
    userId,
    eventId,
    sessionId,
    contact: { name: 'Buyer', email: 'buyer@test.dev', phone: '+910000000000' },
    items: [{ ticketTypeId: generalTypeId, quantity: 1 }],
  });
}

describe('createBooking — concurrency safety', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await resetData();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetData();
  });

  it('never oversells when more buyers than seats race for the last tickets', async () => {
    const CAPACITY = 10;
    const ATTEMPTS = 40;
    await seedFixture(CAPACITY);

    // Fire many bookings in parallel against limited inventory.
    const results = await Promise.allSettled(
      Array.from({ length: ATTEMPTS }, (_, i) => bookOne(userIds[i % userIds.length]))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    // Exactly CAPACITY bookings may succeed.
    expect(succeeded).toBe(CAPACITY);
    expect(failed).toBe(ATTEMPTS - CAPACITY);

    // sold_count must equal capacity and never exceed it.
    const type = await prisma.ticketType.findUnique({ where: { id: generalTypeId } });
    expect(type?.soldCount).toBe(CAPACITY);
    expect(type!.soldCount).toBeLessThanOrEqual(type!.capacity);

    // Ticket rows issued must match seats sold.
    const ticketCount = await prisma.ticket.count();
    expect(ticketCount).toBe(CAPACITY);
  });

  it('rejects a booking that exceeds remaining capacity', async () => {
    await seedFixture(5);
    await expect(
      createBooking({
        userId: userIds[0],
        eventId,
        sessionId,
        contact: { name: 'X', email: 'x@test.dev', phone: '+910000000000' },
        items: [{ ticketTypeId: generalTypeId, quantity: 6 }],
      })
    ).rejects.toBeInstanceOf(InsufficientCapacityError);

    const type = await prisma.ticketType.findUnique({ where: { id: generalTypeId } });
    expect(type?.soldCount).toBe(0); // rolled back, nothing sold
  });

  it('issues correct tickets and totals for a valid multi-quantity booking', async () => {
    await seedFixture(20);
    const res = await bookOneMany(userIds[0], 3);
    expect(res.ticketIds).toHaveLength(3);
    expect(res.totalAmount).toBe(300);

    const type = await prisma.ticketType.findUnique({ where: { id: generalTypeId } });
    expect(type?.soldCount).toBe(3);
  });
});

function bookOneMany(userId: string, quantity: number) {
  return createBooking({
    userId,
    eventId,
    sessionId,
    contact: { name: 'Buyer', email: 'buyer@test.dev', phone: '+910000000000' },
    items: [{ ticketTypeId: generalTypeId, quantity }],
  });
}
