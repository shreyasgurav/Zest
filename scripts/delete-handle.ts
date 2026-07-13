import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const handles = await prisma.handle.findMany({
    where: {
      value: 'shreyasgurav'
    }
  });
  console.log('Handles with value shreyasgurav:', handles);
  
  if (handles.length > 0) {
    await prisma.handle.deleteMany({
      where: {
        value: 'shreyasgurav'
      }
    });
    console.log('Deleted conflicting handles');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
