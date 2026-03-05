import { count } from 'drizzle-orm';
import { db } from './index';
import { branches, inventory } from './schema';

async function seed() {
  console.log('🌱 Seeding inventory database...');

  const branchCountResult = await db.select({ value: count() }).from(branches);
  const branchCount = branchCountResult[0]?.value ?? 0;
  const inventoryCountResult = await db.select({ value: count() }).from(inventory);
  const inventoryCount = inventoryCountResult[0]?.value ?? 0;

  if (branchCount > 0 || inventoryCount > 0) {
    console.log(`⏭️ Skip inventory seed: data already exists (${branchCount} branches, ${inventoryCount} inventory rows)`);
    process.exit(0);
  }

  const branchData = [
    {
      code: 'KB-JKT-S',
      name: 'Kebayoran Baru',
      address: 'Jl. Kebayoran Baru Raya No. 123, Jakarta Selatan',
    },
    {
      code: 'KB-JKT-E',
      name: 'Jatinegara',
      address: 'Jl. Jatinegara Timur No. 45, Jakarta Timur',
    },
    {
      code: 'KB-JKT-N',
      name: 'Kelapa Gading',
      address: 'Jl. Boulevard Kelapa Gading Blok M, Jakarta Utara',
    },
  ];

  await db.insert(branches).values(branchData);
  console.log('✅ Inserted 3 branches');

  const sampleLensIds = [
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440005',
  ];

  const inventoryData: Array<{
    lensId: string;
    branchCode: string;
    totalQuantity: number;
    availableQuantity: number;
  }> = [];

  sampleLensIds.forEach((lensId) => {
    inventoryData.push({
      lensId,
      branchCode: 'KB-JKT-S',
      totalQuantity: 5,
      availableQuantity: 5,
    });
  });

  sampleLensIds.slice(0, 4).forEach((lensId) => {
    inventoryData.push({
      lensId,
      branchCode: 'KB-JKT-E',
      totalQuantity: 3,
      availableQuantity: 3,
    });
  });

  sampleLensIds.slice(0, 3).forEach((lensId) => {
    inventoryData.push({
      lensId,
      branchCode: 'KB-JKT-N',
      totalQuantity: 2,
      availableQuantity: 2,
    });
  });

  await db.insert(inventory).values(inventoryData);
  console.log(`✅ Inserted ${inventoryData.length} inventory records`);

  console.log('🎉 Seed completed!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});