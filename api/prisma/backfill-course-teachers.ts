import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Si tu as teacherId legacy : on connect dans teachers[]
  const courses = await prisma.course.findMany({
    where: { 
      teacherId: {
        not: undefined
      }
    },
    select: { id: true, teacherId: true },
  });

  let done = 0;

  for (const c of courses) {
    const teacherId = c.teacherId!;
    // vérifie que c'est bien un TEACHER
    const t = await prisma.user.findFirst({
      where: { id: teacherId, role: "TEACHER" },
      select: { id: true },
    });
    if (!t) continue;

    await prisma.course.update({
      where: { id: c.id },
      data: {
        teachers: { connect: { id: teacherId } },
      },
    });
    done++;
  }

  console.log(`Backfill terminé: ${done}/${courses.length} cours mis à jour`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
