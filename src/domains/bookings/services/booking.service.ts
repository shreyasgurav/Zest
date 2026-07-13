import { Prisma, PaymentMethod, PaymentStatus, BookingStatus } from '@prisma/client';
import { randomBytes, randomUUID } from 'crypto';
import prisma from '@/infrastructure/database/prisma';

export interface BookingItem {
  ticketTypeId: string;
  quantity: number;
}

export interface CreateBookingInput {
  userId: string;
  eventId: string;
  sessionId: string;
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  items: BookingItem[];
  payment?: {
    method?: PaymentMethod;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  };
}

export interface BookingResult {
  bookingId: string;
  ticketIds: string[];
  totalAmount: number;
}

/** Error thrown when a ticket type cannot satisfy the requested quantity. */
export class InsufficientCapacityError extends Error {
  constructor(public ticketTypeId: string, public available: number, public requested: number) {
    super(
      `Insufficient capacity for ticket type ${ticketTypeId}: available ${available}, requested ${requested}`
    );
    this.name = 'InsufficientCapacityError';
  }
}

function generateTicketNumber(): string {
  const ts = Date.now().toString(36);
  const rand = randomBytes(8).toString('hex');
  return `ZST-${ts}-${rand}`.toUpperCase();
}

// Postgres SQLSTATE codes that are safe to retry: serialization failure and
// deadlock detected. With FOR UPDATE + READ COMMITTED these are rare, but we
// retry defensively so transient contention never surfaces to the user.
const RETRYABLE_CODES = new Set(['40001', '40P01']);

async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      // InsufficientCapacity is a real business failure — never retry it.
      if (err instanceof InsufficientCapacityError) throw err;
      const code = err?.code ?? err?.meta?.code;
      if (!RETRYABLE_CODES.has(code)) throw err;
      lastError = err;
      // Small randomized backoff to break contention symmetry.
      await new Promise((r) => setTimeout(r, 10 * (i + 1) + Math.random() * 10));
    }
  }
  throw lastError;
}

/**
 * Atomically create a booking, decrement inventory, and issue tickets.
 *
 * Concurrency safety (the core of the design):
 *   1. Runs inside a READ COMMITTED transaction (retried on transient conflicts).
 *   2. Acquires row-level locks on the exact ticket_type rows with
 *      `SELECT ... FOR UPDATE`, so concurrent bookings on the same inventory
 *      serialize instead of racing. The second buyer of the last seat blocks
 *      until the first commits, then re-reads the reduced availability and fails.
 *   3. Verifies `capacity - sold_count >= quantity` before incrementing.
 *   4. Inserts booking, tickets, and payment together — all or nothing.
 *
 * Result: overbooking is impossible even under heavy parallel load.
 */
export async function createBooking(input: CreateBookingInput): Promise<BookingResult> {
  const { userId, eventId, sessionId, contact, items, payment } = input;

  if (!items.length) {
    throw new Error('Booking must contain at least one item');
  }

  // Aggregate quantities per ticket type (dedupe repeated ids).
  const quantityByType = new Map<string, number>();
  for (const item of items) {
    if (item.quantity <= 0) continue;
    quantityByType.set(item.ticketTypeId, (quantityByType.get(item.ticketTypeId) ?? 0) + item.quantity);
  }
  const ticketTypeIds = Array.from(quantityByType.keys());
  if (!ticketTypeIds.length) {
    throw new Error('Booking must request a positive quantity');
  }

  return withRetry(() =>
    prisma.$transaction(
    async (tx) => {
      // 1. Lock the inventory rows. Ordering by id makes lock acquisition
      //    deterministic across transactions, preventing deadlocks.
      const locked = await tx.$queryRaw<
        Array<{ id: string; price: Prisma.Decimal; capacity: number; sold_count: number }>
      >`
        SELECT id, price, capacity, sold_count
        FROM ticket_types
        WHERE id IN (${Prisma.join(ticketTypeIds)})
        ORDER BY id
        FOR UPDATE
      `;

      if (locked.length !== ticketTypeIds.length) {
        throw new Error('One or more ticket types were not found');
      }

      // 2. Validate availability for every requested type.
      let totalAmount = new Prisma.Decimal(0);
      const priceByType = new Map<string, Prisma.Decimal>();
      for (const row of locked) {
        const requested = quantityByType.get(row.id) ?? 0;
        const available = row.capacity - row.sold_count;
        if (requested > available) {
          throw new InsufficientCapacityError(row.id, available, requested);
        }
        priceByType.set(row.id, row.price);
        totalAmount = totalAmount.add(row.price.mul(requested));
      }

      // 3. Decrement inventory (increment sold_count) under the held lock.
      for (const [ticketTypeId, quantity] of Array.from(quantityByType)) {
        await tx.ticketType.update({
          where: { id: ticketTypeId },
          data: { soldCount: { increment: quantity } },
        });
      }

      // 4. Create the booking row.
      const booking = await tx.booking.create({
        data: {
          userId,
          eventId,
          sessionId,
          contactName: contact.name,
          contactEmail: contact.email,
          contactPhone: contact.phone,
          totalAmount,
          status: BookingStatus.CONFIRMED,
        },
      });

      // 5. Issue one ticket row per seat.
      const ticketIds: string[] = [];
      for (const [ticketTypeId, quantity] of Array.from(quantityByType)) {
        const price = priceByType.get(ticketTypeId)!;
        for (let i = 0; i < quantity; i++) {
          const ticketNumber = generateTicketNumber();
          const ticket = await tx.ticket.create({
            data: {
              ticketNumber,
              qrCode: ticketNumber,
              bookingId: booking.id,
              ticketTypeId,
              eventId,
              sessionId,
              userId,
              attendeeName: contact.name,
              attendeeEmail: contact.email,
              attendeePhone: contact.phone,
              amount: price,
            },
          });
          ticketIds.push(ticket.id);
        }
      }

      // 6. Record the payment tied to this booking.
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: totalAmount,
          method: payment?.method ?? PaymentMethod.RAZORPAY,
          status: payment?.razorpayPaymentId ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
          razorpayOrderId: payment?.razorpayOrderId,
          razorpayPaymentId: payment?.razorpayPaymentId,
          razorpaySignature: payment?.razorpaySignature,
          completedAt: payment?.razorpayPaymentId ? new Date() : null,
        },
      });

      return {
        bookingId: booking.id,
        ticketIds,
        totalAmount: totalAmount.toNumber(),
      };
    },
    {
      // READ COMMITTED is correct here: the SELECT ... FOR UPDATE row lock
      // already serializes access to the inventory rows, and blocked
      // transactions re-read the fresh sold_count on lock grant. This avoids
      // the spurious 40001 aborts that SERIALIZABLE would raise for this
      // lock-based pattern, while still guaranteeing no overbooking.
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 15_000,
    }
    )
  );
}

// ---------------------------------------------------------------------------
// Activity bookings
// ---------------------------------------------------------------------------

export interface CreateActivityBookingInput {
  userId: string;
  activityId: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  quantity: number;
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  payment?: {
    method?: PaymentMethod;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  };
}

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Atomically create an activity booking against a specific date/time slot.
 *
 * Activities store a recurring weekly schedule as JSON rather than concrete
 * inventory rows. Capacity for a given calendar date is therefore materialized
 * lazily: the first booking for a (date, slot) inserts an `activity_slots` row.
 *
 * Concurrency safety mirrors the event flow:
 *   1. `INSERT ... ON CONFLICT DO NOTHING` guarantees exactly one slot row
 *      exists even if two buyers race for the first booking.
 *   2. `SELECT ... FOR UPDATE` locks that row so capacity checks serialize.
 *   3. Availability is verified before `sold_count` is incremented.
 *   4. Booking, tickets, and payment are written in the same transaction.
 */
export async function createActivityBooking(
  input: CreateActivityBookingInput
): Promise<BookingResult> {
  const { userId, activityId, date, startTime, endTime, quantity, contact, payment } = input;

  if (quantity <= 0) {
    throw new Error('Booking must request a positive quantity');
  }

  // Deterministic UTC weekday for the calendar date (avoids server-timezone drift).
  const weekday = WEEKDAY_NAMES[new Date(`${date}T00:00:00Z`).getUTCDay()];

  return withRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const activity = await tx.activity.findUnique({ where: { id: activityId } });
        if (!activity) {
          throw new Error('Activity not found');
        }

        // Resolve the slot definition (and its capacity) from the weekly schedule.
        const schedule = (activity.weeklySchedule as any[]) || [];
        const daySchedule = schedule.find((d) => d?.day === weekday);
        const slotDef = daySchedule?.time_slots?.find(
          (s: any) => s.start_time === startTime && s.end_time === endTime
        );
        if (!daySchedule?.is_open || !slotDef) {
          throw new Error('Selected time slot is not available for this activity');
        }
        const capacity = Number(slotDef.capacity);
        if (!Number.isFinite(capacity) || capacity <= 0) {
          throw new Error('Invalid capacity configured for this time slot');
        }
        const price = activity.pricePerSlot;

        // 1. Ensure the concrete slot row exists (idempotent under races).
        await tx.$executeRaw`
          INSERT INTO activity_slots (id, activity_id, date, start_time, end_time, capacity, sold_count, created_at, updated_at)
          VALUES (${randomUUID()}, ${activityId}, ${date}, ${startTime}, ${endTime}, ${capacity}, 0, now(), now())
          ON CONFLICT (activity_id, date, start_time, end_time) DO NOTHING
        `;

        // 2. Lock the slot row so concurrent bookings serialize on it.
        const locked = await tx.$queryRaw<
          Array<{ id: string; capacity: number; sold_count: number }>
        >`
          SELECT id, capacity, sold_count
          FROM activity_slots
          WHERE activity_id = ${activityId}
            AND date = ${date}
            AND start_time = ${startTime}
            AND end_time = ${endTime}
          FOR UPDATE
        `;
        const slot = locked[0];
        if (!slot) {
          throw new Error('Failed to materialize activity slot');
        }

        // 3. Verify availability before committing to the sale.
        const available = slot.capacity - slot.sold_count;
        if (quantity > available) {
          throw new InsufficientCapacityError(slot.id, available, quantity);
        }

        await tx.$executeRaw`
          UPDATE activity_slots
          SET sold_count = sold_count + ${quantity}, updated_at = now()
          WHERE id = ${slot.id}
        `;

        const totalAmount = price.mul(quantity);

        // 4. Create the booking row.
        const booking = await tx.booking.create({
          data: {
            userId,
            activityId,
            activitySlotId: slot.id,
            contactName: contact.name,
            contactEmail: contact.email,
            contactPhone: contact.phone,
            totalAmount,
            status: BookingStatus.CONFIRMED,
          },
        });

        // 5. Issue one ticket row per seat.
        const ticketIds: string[] = [];
        for (let i = 0; i < quantity; i++) {
          const ticketNumber = generateTicketNumber();
          const ticket = await tx.ticket.create({
            data: {
              ticketNumber,
              qrCode: ticketNumber,
              bookingId: booking.id,
              activityId,
              activitySlotId: slot.id,
              userId,
              attendeeName: contact.name,
              attendeeEmail: contact.email,
              attendeePhone: contact.phone,
              amount: price,
            },
          });
          ticketIds.push(ticket.id);
        }

        // 6. Record the payment tied to this booking.
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            amount: totalAmount,
            method: payment?.method ?? PaymentMethod.RAZORPAY,
            status: payment?.razorpayPaymentId ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
            razorpayOrderId: payment?.razorpayOrderId,
            razorpayPaymentId: payment?.razorpayPaymentId,
            razorpaySignature: payment?.razorpaySignature,
            completedAt: payment?.razorpayPaymentId ? new Date() : null,
          },
        });

        return {
          bookingId: booking.id,
          ticketIds,
          totalAmount: totalAmount.toNumber(),
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 15_000,
      }
    )
  );
}
