import { PrismaClient, PageType, HandleOwnerType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean slate (dev only) — order respects FK constraints.
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

  // Organizer user + their organisation page.
  const organizer = await prisma.user.create({
    data: {
      email: 'organizer@zest.dev',
      name: 'Zest Organizer',
      phone: '+910000000001',
      googleLinked: true,
      handle: { create: { value: 'zestorg', ownerType: HandleOwnerType.USER } },
    },
  });

  const orgPage = await prisma.page.create({
    data: {
      type: PageType.ORGANISATION,
      name: 'Zest Live',
      city: 'Pune',
      ownerId: organizer.id,
      handle: { create: { value: 'zestlive', ownerType: HandleOwnerType.ORGANISATION } },
    },
  });

  // A sample event with one session and two ticket types.
  const event = await prisma.event.create({
    data: {
      title: 'Sunburn Arena',
      about: 'An electrifying night of music.',
      venue: 'Phoenix Marketcity, Pune',
      categories: ['music', 'edm'],
      ownerId: organizer.id,
      creatorPageId: orgPage.id,
      sessions: {
        create: {
          name: 'Main Night',
          date: new Date('2026-01-15'),
          startTime: '18:00',
          endTime: '23:00',
          ticketTypes: {
            create: [
              { name: 'General', price: 999.0, capacity: 100 },
              { name: 'VIP', price: 2999.0, capacity: 10 },
            ],
          },
        },
      },
    },
    include: { sessions: { include: { ticketTypes: true } } },
  });

  // A few sample attendees.
  for (let i = 1; i <= 3; i++) {
    await prisma.user.create({
      data: {
        email: `attendee${i}@zest.dev`,
        name: `Attendee ${i}`,
        phone: `+91000000010${i}`,
      },
    });
  }

  const session = event.sessions[0];
  console.log('Seed complete:');
  console.log('  organizer:', organizer.email);
  console.log('  event:', event.title, `(${event.id})`);
  console.log('  session:', session.id);
  session.ticketTypes.forEach((t) =>
    console.log(`    ticketType: ${t.name} $${t.price} x${t.capacity} (${t.id})`)
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
