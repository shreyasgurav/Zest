import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: 'shrreyasgurav@gmail.com'
    }
  });
  console.log('Users with email shrreyasgurav@gmail.com:', users);

  const phoneUsers = await prisma.user.findMany({
    where: {
      phone: '+911234567890'
    }
  });
  console.log('Users with phone +911234567890:', phoneUsers);
}

main().catch(console.error).finally(() => prisma.$disconnect());
