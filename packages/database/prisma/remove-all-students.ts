import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Remove todas as contas com papel STUDENT (alunas).
 * Mantém ADMIN, TRAINER e NUTRITIONIST.
 */
async function main() {
  const r = await prisma.user.deleteMany({
    where: { role: Role.STUDENT },
  });
  console.log(`Removidas ${r.count} conta(s) de aluna(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
