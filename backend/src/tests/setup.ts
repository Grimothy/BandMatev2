import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll } from 'vitest';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clean database before tests
  await prisma.invitation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.managedFile.deleteMany();
  await prisma.cut.deleteMany();
  await prisma.vibe.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
