const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Deleting all events and related data...');

  // Delete all data in order to respect foreign key constraints
  const deletedTickets = await prisma.ticket.deleteMany({});
  console.log(`Deleted ${deletedTickets.count} tickets`);

  const deletedBookings = await prisma.booking.deleteMany({});
  console.log(`Deleted ${deletedBookings.count} bookings`);

  const deletedActivitySlots = await prisma.activitySlot.deleteMany({});
  console.log(`Deleted ${deletedActivitySlots.count} activity slots`);

  const deletedActivities = await prisma.activity.deleteMany({});
  console.log(`Deleted ${deletedActivities.count} activities`);

  const deletedSessions = await prisma.session.deleteMany({});
  console.log(`Deleted ${deletedSessions.count} sessions`);

  const deletedTicketTypes = await prisma.ticketType.deleteMany({});
  console.log(`Deleted ${deletedTicketTypes.count} ticket types`);

  const deletedEvents = await prisma.event.deleteMany({});
  console.log(`Deleted ${deletedEvents.count} events`);

  console.log('All events and related data have been deleted.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
