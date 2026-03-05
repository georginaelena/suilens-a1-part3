
import { count } from 'drizzle-orm';
import { db } from './index';
import { lenses } from './schema';

const seedLenses = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    modelName: 'Summilux-M 35mm f/1.4 ASPH.',
    manufacturerName: 'Leica',
    minFocalLength: 35,
    maxFocalLength: 35,
    maxAperture: '1.4',
    mountType: 'Leica M',
    dayPrice: '450000.00',
    weekendPrice: '750000.00',
    description: 'A legendary 35mm lens renowned for its rendering and character.',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    modelName: 'Art 24-70mm f/2.8 DG DN',
    manufacturerName: 'Sigma',
    minFocalLength: 24,
    maxFocalLength: 70,
    maxAperture: '2.8',
    mountType: 'Sony E',
    dayPrice: '200000.00',
    weekendPrice: '350000.00',
    description: 'Professional-grade standard zoom for mirrorless systems.',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    modelName: 'NIKKOR Z 70-200mm f/2.8 VR S',
    manufacturerName: 'Nikon',
    minFocalLength: 70,
    maxFocalLength: 200,
    maxAperture: '2.8',
    mountType: 'Nikon Z',
    dayPrice: '350000.00',
    weekendPrice: '600000.00',
    description: 'Nikon flagship telephoto zoom for the Z system.',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    modelName: 'RF 85mm f/1.2 L USM',
    manufacturerName: 'Canon',
    minFocalLength: 85,
    maxFocalLength: 85,
    maxAperture: '1.2',
    mountType: 'Canon RF',
    dayPrice: '300000.00',
    weekendPrice: '500000.00',
    description: 'Premium portrait lens with stunning bokeh.',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    modelName: 'FE 24mm f/1.4 GM',
    manufacturerName: 'Sony',
    minFocalLength: 24,
    maxFocalLength: 24,
    maxAperture: '1.4',
    mountType: 'Sony E',
    dayPrice: '250000.00',
    weekendPrice: '420000.00',
    description: 'Wide-angle prime with exceptional sharpness.',
  },
];

async function seed() {
  console.log('🌱 Seeding catalog lenses...');

  const lensCountResult = await db.select({ value: count() }).from(lenses);
  const lensCount = lensCountResult[0]?.value ?? 0;
  if (lensCount > 0) {
    console.log(`⏭️ Skip catalog seed: data already exists (${lensCount} lenses)`);
    process.exit(0);
  }

  await db.insert(lenses).values(seedLenses);
  console.log(`✅ Seeded ${seedLenses.length} lenses.`);
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});