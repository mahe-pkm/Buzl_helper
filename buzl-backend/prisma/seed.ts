import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = process.env.ADMIN_SEED_PASSWORD
  if (!adminPassword) {
    throw new Error('Set ADMIN_SEED_PASSWORD before running prisma seed')
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10)
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      role: 'admin',
    },
  })
  
  console.log('✅ Admin user ready:', admin.username)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
