import { db } from './index';
import { branches, inventory } from './schema';

async function seed() {
  console.log('🌱 Seeding inventory database...');

  // Insert branches
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

  await db.insert(branches).values(branchData).onConflictDoNothing();
  console.log('✅ Inserted 3 branches');

  // Sample lens IDs (you should replace these with actual lens IDs from catalog-service)
  // For now, we'll use placeholder UUIDs - these need to match your catalog-service seed data
  const sampleLensIds = [
    '550e8400-e29b-41d4-a716-446655440001', // Example lens 1
    '550e8400-e29b-41d4-a716-446655440002', // Example lens 2
    '550e8400-e29b-41d4-a716-446655440003', // Example lens 3
    '550e8400-e29b-41d4-a716-446655440004', // Example lens 4
    '550e8400-e29b-41d4-a716-446655440005', // Example lens 5
  ];

  // Create inventory distribution across branches
  const inventoryData: Array<{
    lensId: string;
    branchCode: string;
    totalQuantity: number;
    availableQuantity: number;
  }> = [];
  
  // KB-JKT-S (main studio) - has most stock
  sampleLensIds.forEach((lensId, idx) => {
    inventoryData.push({
      lensId,
      branchCode: 'KB-JKT-S',
      totalQuantity: 5,
      availableQuantity: 5,
    });
  });

  // KB-JKT-E (secondary) - moderate stock
  sampleLensIds.slice(0, 4).forEach((lensId) => {
    inventoryData.push({
      lensId,
      branchCode: 'KB-JKT-E',
      totalQuantity: 3,
      availableQuantity: 3,
    });
  });

  // KB-JKT-N (newest) - limited stock
  sampleLensIds.slice(0, 3).forEach((lensId) => {
    inventoryData.push({
      lensId,
      branchCode: 'KB-JKT-N',
      totalQuantity: 2,
      availableQuantity: 2,
    });
  });

  await db.insert(inventory).values(inventoryData).onConflictDoNothing();
  console.log(`✅ Inserted ${inventoryData.length} inventory records`);

  console.log('🎉 Seed completed!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});