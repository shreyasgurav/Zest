import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.user.delete({
    where: {
      email: 'shrreyasgurav@gmail.com'
    }
  });
  console.log('Deleted old user with email shrreyasgurav@gmail.com');
}

main().catch(console.error).finally(() => prisma.$disconnect());
