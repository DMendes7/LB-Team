import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_STUDENT_EMAILS = [
  "aluna1@lbteam.app",
  "aluna2@lbteam.app",
  "aluna3@lbteam.app",
  "aluna4@lbteam.app",
];

async function main() {
  const r = await prisma.user.deleteMany({
    where: { email: { in: DEMO_STUDENT_EMAILS } },
  });
  console.log(`Removidas ${r.count} conta(s) demo (aluna1–4).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
