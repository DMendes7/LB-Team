import { PrismaClient, Role, StudentGoal, FitnessLevel, WeeklyFrequencyTarget, EngagementTone } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

/** E-mails das alunas demo antigas (removidas a cada seed). */
const DEMO_STUDENT_EMAILS = ["aluna1@lbteam.app", "aluna2@lbteam.app", "aluna3@lbteam.app", "aluna4@lbteam.app"];

async function main() {
  await prisma.engagementMessage.deleteMany({});

  await prisma.user.deleteMany({
    where: { email: { in: DEMO_STUDENT_EMAILS } },
  });

  const password = await bcrypt.hash("Senha123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@lbteam.app" },
    update: {},
    create: {
      email: "admin@lbteam.app",
      passwordHash: password,
      name: "Admin LB",
      role: Role.ADMIN,
      profile: { create: { termsAcceptedAt: new Date() } },
    },
  });

  const trainer = await prisma.user.upsert({
    where: { email: "personal@lbteam.app" },
    update: {},
    create: {
      email: "personal@lbteam.app",
      passwordHash: password,
      name: "Marina Personal",
      phone: "+5511999990001",
      role: Role.TRAINER,
      profile: { create: { termsAcceptedAt: new Date() } },
    },
  });

  const nutritionist = await prisma.user.upsert({
    where: { email: "nutri@lbteam.app" },
    update: {},
    create: {
      email: "nutri@lbteam.app",
      passwordHash: password,
      name: "Dra. Helena Nutri",
      phone: "+5511999990002",
      role: Role.NUTRITIONIST,
      profile: { create: { termsAcceptedAt: new Date() } },
    },
  });

  const exSquat = await prisma.exercise.create({
    data: {
      trainerId: trainer.id,
      name: "Agachamento sumô",
      category: "Força",
      muscleGroup: "Glúteos / Posterior",
      level: FitnessLevel.BEGINNER,
      type: "Composto",
      description: "Base para glúteos com boa amplitude.",
      instructions: "Pés abertos, joelhos alinhados com dedos. Desce controlando.",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      equipment: "Halter ou kettlebell",
      tags: "glúteos,iniciante",
    },
  });

  const exHip = await prisma.exercise.create({
    data: {
      trainerId: trainer.id,
      name: "Elevação pélvica",
      category: "Força",
      muscleGroup: "Glúteos",
      level: FitnessLevel.BEGINNER,
      type: "Isolado",
      instructions: "Apoie as escápulas no banco, empurra o quadril para cima.",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      equipment: "Banco, barra ou halter",
      tags: "glúteos",
    },
  });

  const exPlank = await prisma.exercise.create({
    data: {
      trainerId: trainer.id,
      name: "Prancha frontal",
      category: "Core",
      muscleGroup: "Abdômen",
      level: FitnessLevel.BEGINNER,
      type: "Isométrico",
      instructions: "Corpo alinhado, abdômen ativo.",
      equipment: "Colchonete",
      tags: "core",
    },
  });

  await prisma.exerciseSubstitution.createMany({
    data: [{ primaryExerciseId: exSquat.id, substituteExerciseId: exHip.id }],
    skipDuplicates: true,
  });

  const template = await prisma.workoutTemplate.create({
    data: {
      trainerId: trainer.id,
      name: "Full Glúteos — constância 3x",
      description: "Foco em volume moderado e técnica. Progressão por frequência.",
      objective: StudentGoal.HYPERTROPHY,
      level: FitnessLevel.BEGINNER,
      frequency: WeeklyFrequencyTarget.THREE,
      days: {
        create: [
          {
            dayIndex: 0,
            name: "Dia A — Glúteo + posterior",
            exercises: {
              create: [
                { exerciseId: exSquat.id, orderIndex: 0, sets: 3, reps: "12-15", restSec: 75 },
                {
                  exerciseId: exHip.id,
                  orderIndex: 1,
                  sets: 3,
                  reps: "10-12",
                  restSec: 60,
                  painAdjustHint: "Reduza amplitude se sentir desconforto lombar.",
                },
                { exerciseId: exPlank.id, orderIndex: 2, sets: 3, reps: "30s", durationSec: 30, restSec: 45 },
              ],
            },
          },
          {
            dayIndex: 1,
            name: "Dia B — Ênfase glúteo médio",
            exercises: {
              create: [
                { exerciseId: exHip.id, orderIndex: 0, sets: 4, reps: "10", restSec: 60 },
                { exerciseId: exSquat.id, orderIndex: 1, sets: 3, reps: "15", restSec: 60 },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.workoutGroup.create({
    data: {
      trainerId: trainer.id,
      name: "Grupo Glúteos Iniciante",
      description: "Plano base para alunas iniciantes com meta 3x/semana. Associe alunas pelo painel ou ao cadastrarem.",
      templateId: template.id,
    },
  });

  const nutriTemplate = await prisma.nutritionTemplate.create({
    data: {
      authorId: nutritionist.id,
      title: "Diretrizes flexíveis — hipertrofia",
      objective: StudentGoal.HYPERTROPHY,
      summary: "Priorize proteína em cada refeição principal; carboidratos ao redor do treino.",
      guidelines: "Hidratação ao longo do dia. Ajuste por fome e energia — sem culpa por imprevistos.",
      practicalTips: "Marmitas simples, iogurte + fruta, lanches com proteína.",
      meals: {
        create: [
          { name: "Café reforçado", description: "Ovos + pão integral + fruta", orderIndex: 0, substitutions: "Tapioca + queijo; aveia + whey" },
          { name: "Almoço", description: "Prato com proteína (2 palmas), arroz, salada", orderIndex: 1, substitutions: "Macarrão integral; legumes variados" },
          { name: "Pré/pós treino", description: "Banana + whey ou iogurte", orderIndex: 2 },
        ],
      },
    },
  });

  await prisma.nutritionGroup.create({
    data: {
      nutritionistId: nutritionist.id,
      name: "Grupo Hipertrofia leve",
      templateId: nutriTemplate.id,
    },
  });

  for (let level = 1; level <= 10; level++) {
    await prisma.levelRule.upsert({
      where: { level },
      update: {
        weeksRequired: Math.min(2 + Math.floor(level / 3), 6),
        unlockSummary: `Nível ${level}: mais volume e estímulos progressivos conforme constância.`,
        streakActivities: ["WORKOUT_COMPLETE", "DAILY_CHECKIN", "NUTRITION_VIEW", "DISPOSITION_LOG"],
      },
      create: {
        level,
        weeksRequired: Math.min(2 + Math.floor(level / 3), 6),
        unlockSummary: `Nível ${level}: mais volume e estímulos progressivos conforme constância.`,
        streakActivities: ["WORKOUT_COMPLETE", "DAILY_CHECKIN", "NUTRITION_VIEW", "DISPOSITION_LOG"],
      },
    });
  }

  const messages: { tone: EngagementTone; template: string; priority: number }[] = [
    { tone: EngagementTone.STREAK_LOST, template: "Tudo bem recomeçar. Seu progresso continua.", priority: 10 },
    { tone: EngagementTone.STREAK_LOST, template: "Um dia fora não define sua jornada.", priority: 9 },
    { tone: EngagementTone.STREAK_LOST, template: "Você não perdeu sua evolução, apenas sua sequência.", priority: 8 },
    { tone: EngagementTone.RETURNED_AFTER_BREAK, template: "Voltar hoje já é uma vitória.", priority: 10 },
    { tone: EngagementTone.WEEKLY_ALMOST_DONE, template: "Você está a 1 treino de completar sua meta semanal.", priority: 7 },
    { tone: EngagementTone.DEFAULT, template: "Consistência vale mais que perfeição.", priority: 1 },
    { tone: EngagementTone.DEFAULT, template: "Hoje pode ser leve, mas ainda conta.", priority: 2 },
    { tone: EngagementTone.STREAK_KEPT, template: "Seu foco está construindo sua evolução.", priority: 5 },
    { tone: EngagementTone.STREAK_AT_RISK, template: "Que tal um check-in rápido para manter seu fogo aceso?", priority: 6 },
  ];

  for (const m of messages) {
    await prisma.engagementMessage.create({ data: m });
  }

  await prisma.adminSetting.upsert({
    where: { key: "streak_window_hours" },
    update: { value: 24 },
    create: { key: "streak_window_hours", value: 24 },
  });

  await prisma.adminSetting.upsert({
    where: { key: "streak_activity_types" },
    update: { value: ["WORKOUT_COMPLETE", "DAILY_CHECKIN", "NUTRITION_VIEW", "DISPOSITION_LOG"] },
    create: { key: "streak_activity_types", value: ["WORKOUT_COMPLETE", "DAILY_CHECKIN", "NUTRITION_VIEW", "DISPOSITION_LOG"] },
  });

  console.log("Seed OK — admin/personal/nutri: Senha123! | Alunas demo (aluna1–4) removidas se existirem.");
  console.log("Novas alunas são vinculadas ao primeiro personal/nutri (ou DEFAULT_*_EMAIL na API).");
  console.log({ admin: admin.email, trainer: trainer.email, nutritionist: nutritionist.email });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
