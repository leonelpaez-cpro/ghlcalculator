import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Crear algunas categorías de prueba
  const category1 = await prisma.category.upsert({
    where: { name: 'Desarrollo Web' },
    update: {},
    create: {
      name: 'Desarrollo Web',
      description: 'Servicios de desarrollo web y aplicaciones'
    },
  })

  const category2 = await prisma.category.upsert({
    where: { name: 'Marketing Digital' },
    update: {},
    create: {
      name: 'Marketing Digital',
      description: 'Servicios de marketing y publicidad digital'
    },
  })

  const category3 = await prisma.category.upsert({
    where: { name: 'Consultoría' },
    update: {},
    create: {
      name: 'Consultoría',
      description: 'Servicios de consultoría y asesoramiento'
    },
  })

  // Crear algunos servicios de prueba
  const service1 = await prisma.service.upsert({
    where: { name: 'Desarrollo de Sitio Web' },
    update: {},
    create: {
      name: 'Desarrollo de Sitio Web',
      description: 'Sitio web profesional con diseño responsive',
      setupPrice: 50000, // $500.00 en centavos
      monthlyPrice: 15000, // $150.00 en centavos
      categoryId: category1.id,
      isActive: true
    },
  })

  const service2 = await prisma.service.upsert({
    where: { name: 'Aplicación Web' },
    update: {},
    create: {
      name: 'Aplicación Web',
      description: 'Aplicación web personalizada con funcionalidades avanzadas',
      setupPrice: 150000, // $1,500.00 en centavos
      monthlyPrice: 25000, // $250.00 en centavos
      categoryId: category1.id,
      isActive: true
    },
  })

  const service3 = await prisma.service.upsert({
    where: { name: 'Gestión de Redes Sociales' },
    update: {},
    create: {
      name: 'Gestión de Redes Sociales',
      description: 'Gestión completa de redes sociales para tu negocio',
      setupPrice: 20000, // $200.00 en centavos
      monthlyPrice: 30000, // $300.00 en centavos
      categoryId: category2.id,
      isActive: true
    },
  })

  const service4 = await prisma.service.upsert({
    where: { name: 'Consultoría Estratégica' },
    update: {},
    create: {
      name: 'Consultoría Estratégica',
      description: 'Asesoramiento estratégico para el crecimiento de tu negocio',
      setupPrice: 100000, // $1,000.00 en centavos
      monthlyPrice: null, // Sin precio mensual
      categoryId: category3.id,
      isActive: true
    },
  })

  console.log('Datos de prueba creados exitosamente')
  console.log('Categorías:', { category1, category2, category3 })
  console.log('Servicios:', { service1, service2, service3, service4 })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
