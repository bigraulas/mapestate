import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds realistic demo data for broker@dunwell.ro:
 * - 1 company (Maspex Romania)
 * - 1 contact person
 * - 4 buildings in Bucharest/Ilfov area with real coordinates
 * - Multiple units per building with technical + commercial specs
 * - 1 property request (deal) linked to the company
 */
async function main() {
  console.log('Seeding demo data for broker@dunwell.ro...');

  // Get broker user
  const broker = await prisma.user.findUnique({
    where: { email: 'broker@dunwell.ro' },
  });
  if (!broker) {
    throw new Error('Broker user not found. Run main seed first.');
  }

  // Get locations
  const chiajna = await prisma.location.findFirst({ where: { name: 'Chiajna' } });
  const stefanesti = await prisma.location.findFirst({ where: { name: 'Stefăneștii de Jos' } });
  const pantelimon = await prisma.location.findFirst({ where: { name: 'Pantelimon' } });
  const otopeni = await prisma.location.findFirst({ where: { name: 'Otopeni' } });

  if (!chiajna || !stefanesti || !pantelimon || !otopeni) {
    throw new Error('Required locations not found. Run main seed first.');
  }

  // ── Company ──────────────────────────────────────────────────
  const company = await prisma.company.create({
    data: {
      name: 'Maspex Romania SRL',
      vatNumber: 'RO12345678',
      address: 'Str. Industriei 15, Sector 3, București',
      openDeals: 1,
      userId: broker.id,
    },
  });
  console.log(`Created company: ${company.name}`);

  // ── Contact Person ───────────────────────────────────────────
  const person = await prisma.person.create({
    data: {
      name: 'Andrei Marinescu',
      jobTitle: 'Logistics Director',
      emails: JSON.parse('["andrei.marinescu@maspex.ro", "logistics@maspex.ro"]'),
      phones: JSON.parse('["40727808355", "40721555123"]'),
      source: 'Referral',
      companyId: company.id,
      labelId: 1, // Customer
      userId: broker.id,
    },
  });
  console.log(`Created person: ${person.name}`);

  // ── Building 1: CTPark Bucharest West (Chiajna) ─────────────
  const building1 = await prisma.building.create({
    data: {
      name: 'CTPark Bucharest West',
      propertyCode: 'CTP-BW-01',
      totalSqm: 45000,
      availableSqm: 12500,
      address: 'Str. Industriilor 5, Chiajna, Ilfov',
      latitude: 44.4355,
      longitude: 25.9680,
      transactionType: 'RENT',
      clearHeight: 10.0,
      floorLoading: 5.0,
      sprinkler: true,
      heating: 'Incalzire radianta',
      powerSupply: '2x1000 kVA',
      buildingStructure: 'Beton prefabricat',
      lighting: 'LED',
      gridStructure: '12m x 24m',
      gridFormat: '12.00 x 24.00m',
      hydrantSystem: true,
      isuAuthorization: true,
      temperature: 'Ambient',
      expandingPossibilities: 'Da, in cadrul parcului',
      serviceCharge: 1.25,
      availableFrom: new Date('2026-03-01'),
      description: 'Parc logistic modern cu acces direct la autostrada A1. Certificat BREEAM Excellent.',
      locationId: chiajna.id,
      userId: broker.id,
      ownerName: 'CTP Invest Romania',
      ownerPhone: '+40 21 310 1500',
      ownerEmail: 'leasing@ctp.eu',
      minContractYears: 5,
    },
  });

  // Units for Building 1
  await prisma.unit.createMany({
    data: [
      {
        name: 'Hala A1',
        warehouseSpace: { sqm: 5000, rentPrice: 4.25 },
        officeSpace: { sqm: 250, rentPrice: 10.50 },
        sanitarySpace: { sqm: 80, rentPrice: 0 },
        docks: 6,
        driveins: 2,
        usefulHeight: 10.0,
        hasOffice: true,
        officeSqm: 250,
        hasSanitary: true,
        sanitarySqm: 80,
        warehousePrice: 4.25,
        officePrice: 10.50,
        crossDock: false,
        temperature: 'Ambient',
        sprinkler: true,
        hydrantSystem: true,
        isuAuthorization: true,
        heating: 'Incalzire radianta in pardoseala',
        buildingStructure: 'Beton prefabricat',
        gridStructure: '12m',
        gridFormat: 'x 24m',
        floorLoading: 5.0,
        lighting: 'LED T5',
        serviceCharge: 1.25,
        availableFrom: new Date('2026-03-01'),
        contractLength: '5 ani + optiune prelungire',
        expandingPossibilities: 'Da, hala A2 adiacenta',
        buildingId: building1.id,
        userId: broker.id,
      },
      {
        name: 'Hala A2',
        warehouseSpace: { sqm: 7500, rentPrice: 4.10 },
        officeSpace: { sqm: 400, rentPrice: 10.00 },
        sanitarySpace: { sqm: 120, rentPrice: 0 },
        docks: 8,
        driveins: 2,
        usefulHeight: 10.0,
        hasOffice: true,
        officeSqm: 400,
        hasSanitary: true,
        sanitarySqm: 120,
        warehousePrice: 4.10,
        officePrice: 10.00,
        crossDock: true,
        temperature: 'Ambient',
        sprinkler: true,
        hydrantSystem: true,
        isuAuthorization: true,
        heating: 'Incalzire radianta in pardoseala',
        buildingStructure: 'Beton prefabricat',
        gridStructure: '12m',
        gridFormat: 'x 24m',
        floorLoading: 5.0,
        lighting: 'LED T5',
        serviceCharge: 1.25,
        availableFrom: new Date('2026-03-01'),
        contractLength: '5 ani + optiune prelungire',
        expandingPossibilities: 'Da, in cadrul parcului CTP',
        buildingId: building1.id,
        userId: broker.id,
      },
    ],
  });
  console.log(`Created building: ${building1.name} (2 units)`);

  // ── Building 2: WDP Stefanestii de Jos ──────────────────────
  const building2 = await prisma.building.create({
    data: {
      name: 'WDP Industrial Park',
      propertyCode: 'WDP-SJ-01',
      totalSqm: 32000,
      availableSqm: 8200,
      address: 'Sos. Afumati 1, Stefăneștii de Jos, Ilfov',
      latitude: 44.5430,
      longitude: 26.1580,
      transactionType: 'RENT',
      clearHeight: 10.5,
      floorLoading: 5.0,
      sprinkler: true,
      heating: 'Incalzire cu aer cald',
      powerSupply: '1x630 kVA',
      buildingStructure: 'Structura metalica',
      lighting: 'LED',
      gridStructure: '15m x 18m',
      gridFormat: '15.00 x 18.00m',
      hydrantSystem: true,
      isuAuthorization: true,
      temperature: 'Ambient',
      expandingPossibilities: 'Da, teren disponibil adiacent',
      serviceCharge: 1.10,
      availableFrom: new Date('2026-04-15'),
      description: 'Depozit clasa A cu acces DN2/Autostrada A3. Platforma betonata TIR.',
      locationId: stefanesti.id,
      userId: broker.id,
      ownerName: 'WDP Romania',
      ownerPhone: '+40 21 527 8700',
      ownerEmail: 'romania@wdp.eu',
      minContractYears: 3,
    },
  });

  await prisma.unit.createMany({
    data: [
      {
        name: 'Compartiment C3',
        warehouseSpace: { sqm: 4200, rentPrice: 3.95 },
        officeSpace: { sqm: 180, rentPrice: 9.50 },
        sanitarySpace: { sqm: 60, rentPrice: 0 },
        docks: 5,
        driveins: 1,
        usefulHeight: 10.5,
        hasOffice: true,
        officeSqm: 180,
        hasSanitary: true,
        sanitarySqm: 60,
        warehousePrice: 3.95,
        officePrice: 9.50,
        temperature: 'Ambient',
        sprinkler: true,
        hydrantSystem: true,
        isuAuthorization: true,
        heating: 'Aer cald',
        buildingStructure: 'Structura metalica',
        gridStructure: '15m',
        gridFormat: 'x 18m',
        floorLoading: 5.0,
        lighting: 'LED',
        serviceCharge: 1.10,
        availableFrom: new Date('2026-04-15'),
        contractLength: '3 ani + optiune 5 ani',
        expandingPossibilities: 'Da, compartimentul C4',
        buildingId: building2.id,
        userId: broker.id,
      },
      {
        name: 'Compartiment C4',
        warehouseSpace: { sqm: 4000, rentPrice: 3.95 },
        officeSpace: { sqm: 200, rentPrice: 9.50 },
        sanitarySpace: { sqm: 50, rentPrice: 0 },
        docks: 4,
        driveins: 1,
        usefulHeight: 10.5,
        hasOffice: true,
        officeSqm: 200,
        hasSanitary: true,
        sanitarySqm: 50,
        warehousePrice: 3.95,
        officePrice: 9.50,
        temperature: 'Ambient',
        sprinkler: true,
        hydrantSystem: true,
        isuAuthorization: true,
        heating: 'Aer cald',
        buildingStructure: 'Structura metalica',
        gridStructure: '15m',
        gridFormat: 'x 18m',
        floorLoading: 5.0,
        lighting: 'LED',
        serviceCharge: 1.10,
        availableFrom: new Date('2026-05-01'),
        contractLength: '3 ani + optiune 5 ani',
        expandingPossibilities: 'Nu',
        buildingId: building2.id,
        userId: broker.id,
      },
    ],
  });
  console.log(`Created building: ${building2.name} (2 units)`);

  // ── Building 3: P3 Logistic Park Bucharest ──────────────────
  const building3 = await prisma.building.create({
    data: {
      name: 'P3 Logistic Park Bucharest',
      propertyCode: 'P3-BUC-02',
      totalSqm: 55000,
      availableSqm: 15000,
      address: 'Autostrada A1, km 13, Chiajna, Ilfov',
      latitude: 44.4290,
      longitude: 25.9790,
      transactionType: 'RENT',
      clearHeight: 12.0,
      floorLoading: 6.0,
      sprinkler: true,
      heating: 'Incalzire in pardoseala',
      powerSupply: '2x1250 kVA',
      buildingStructure: 'Beton prefabricat',
      lighting: 'LED High Bay',
      gridStructure: '16m x 22.5m',
      gridFormat: '16.00 x 22.50m',
      hydrantSystem: true,
      isuAuthorization: true,
      temperature: 'Ambient',
      expandingPossibilities: 'Da, build-to-suit pe teren adiacent',
      serviceCharge: 1.35,
      availableFrom: new Date('2026-06-01'),
      description: 'Parc logistic premium cu certificare BREEAM Outstanding. 35m curte de manevra.',
      locationId: chiajna.id,
      userId: broker.id,
      ownerName: 'P3 Logistic Parks',
      ownerPhone: '+40 21 300 5600',
      ownerEmail: 'leasing.ro@p3parks.com',
      minContractYears: 5,
    },
  });

  await prisma.unit.createMany({
    data: [
      {
        name: 'Hala B - Sectiunea 1',
        warehouseSpace: { sqm: 8000, rentPrice: 4.50 },
        officeSpace: { sqm: 500, rentPrice: 11.00 },
        sanitarySpace: { sqm: 150, rentPrice: 0 },
        docks: 10,
        driveins: 2,
        usefulHeight: 12.0,
        hasOffice: true,
        officeSqm: 500,
        hasSanitary: true,
        sanitarySqm: 150,
        warehousePrice: 4.50,
        officePrice: 11.00,
        crossDock: false,
        temperature: 'Ambient',
        sprinkler: true,
        hydrantSystem: true,
        isuAuthorization: true,
        heating: 'Incalzire in pardoseala',
        buildingStructure: 'Beton prefabricat',
        gridStructure: '16m',
        gridFormat: 'x 22.50m',
        floorLoading: 6.0,
        lighting: 'LED High Bay',
        serviceCharge: 1.35,
        availableFrom: new Date('2026-06-01'),
        contractLength: '5 ani ferm + 5 ani optiune',
        expandingPossibilities: 'Da, sectiunea 2 disponibila Q3 2026',
        buildingId: building3.id,
        userId: broker.id,
      },
      {
        name: 'Hala B - Sectiunea 2',
        warehouseSpace: { sqm: 7000, rentPrice: 4.50 },
        officeSpace: { sqm: 350, rentPrice: 11.00 },
        sanitarySpace: { sqm: 100, rentPrice: 0 },
        docks: 8,
        driveins: 2,
        usefulHeight: 12.0,
        hasOffice: true,
        officeSqm: 350,
        hasSanitary: true,
        sanitarySqm: 100,
        warehousePrice: 4.50,
        officePrice: 11.00,
        crossDock: true,
        temperature: 'Ambient',
        sprinkler: true,
        hydrantSystem: true,
        isuAuthorization: true,
        heating: 'Incalzire in pardoseala',
        buildingStructure: 'Beton prefabricat',
        gridStructure: '16m',
        gridFormat: 'x 22.50m',
        floorLoading: 6.0,
        lighting: 'LED High Bay',
        serviceCharge: 1.35,
        availableFrom: new Date('2026-09-01'),
        contractLength: '5 ani ferm + 5 ani optiune',
        expandingPossibilities: 'Da, build-to-suit pe teren adiacent',
        buildingId: building3.id,
        userId: broker.id,
      },
    ],
  });
  console.log(`Created building: ${building3.name} (2 units)`);

  // ── Building 4: Equest Logistic Park Pantelimon ─────────────
  const building4 = await prisma.building.create({
    data: {
      name: 'Equest Logistic Park',
      propertyCode: 'EQS-PNT-01',
      totalSqm: 22000,
      availableSqm: 6500,
      address: 'Sos. de Centura 23, Pantelimon, Ilfov',
      latitude: 44.4530,
      longitude: 26.2080,
      transactionType: 'RENT',
      clearHeight: 9.0,
      floorLoading: 4.0,
      sprinkler: true,
      heating: 'Aeroterme pe gaz',
      powerSupply: '1x400 kVA',
      buildingStructure: 'Structura metalica',
      lighting: 'LED',
      gridStructure: '12m x 20m',
      gridFormat: '12.00 x 20.00m',
      hydrantSystem: true,
      isuAuthorization: false,
      temperature: 'Ambient',
      expandingPossibilities: 'Nu',
      serviceCharge: 0.95,
      availableFrom: new Date('2026-02-20'),
      description: 'Depozit clasa B+ cu acces la centura Bucuresti. Ideal distributie last-mile.',
      locationId: pantelimon.id,
      userId: broker.id,
      ownerName: 'Equest Invest',
      ownerPhone: '+40 722 100 200',
      ownerEmail: 'office@equest.ro',
      minContractYears: 3,
    },
  });

  await prisma.unit.create({
    data: {
      name: 'Depozit D2',
      warehouseSpace: { sqm: 6500, rentPrice: 3.50 },
      officeSpace: { sqm: 150, rentPrice: 8.00 },
      sanitarySpace: { sqm: 40, rentPrice: 0 },
      docks: 4,
      driveins: 1,
      usefulHeight: 9.0,
      hasOffice: true,
      officeSqm: 150,
      hasSanitary: true,
      sanitarySqm: 40,
      warehousePrice: 3.50,
      officePrice: 8.00,
      temperature: 'Ambient',
      sprinkler: true,
      hydrantSystem: true,
      isuAuthorization: false,
      heating: 'Aeroterme pe gaz',
      buildingStructure: 'Structura metalica',
      gridStructure: '12m',
      gridFormat: 'x 20m',
      floorLoading: 4.0,
      lighting: 'LED',
      serviceCharge: 0.95,
      availableFrom: new Date('2026-02-20'),
      contractLength: '3 ani minim',
      expandingPossibilities: 'Nu',
      buildingId: building4.id,
      userId: broker.id,
    },
  });
  console.log(`Created building: ${building4.name} (1 unit)`);

  // ── Property Request (Deal) ─────────────────────────────────
  const deal = await prisma.propertyRequest.create({
    data: {
      name: 'Maspex - Depozit Logistic Bucuresti',
      numberOfSqm: 8000,
      minHeight: 10.0,
      estimatedFeeValue: 25000,
      contractPeriod: 5,
      breakOptionAfter: 3,
      startDate: new Date('2026-04-01'),
      requestType: 'RENT',
      status: 'OFFERING',
      dealType: 'REQUEST',
      notes: 'Client cauta spatiu logistic clasa A pentru depozitare produse alimentare ambalate. Necesita minim 6 dockuri, sprinkler obligatoriu, preferinta zona vest Bucuresti.',
      companyId: company.id,
      personId: person.id,
      userId: broker.id,
      locations: {
        connect: [
          { id: chiajna.id },
          { id: stefanesti.id },
          { id: pantelimon.id },
        ],
      },
    },
  });
  console.log(`Created deal: ${deal.name}`);

  console.log('\n✓ Demo data seeded successfully!');
  console.log(`  Company: ${company.name} (ID: ${company.id})`);
  console.log(`  Person: ${person.name} (ID: ${person.id})`);
  console.log(`  Buildings: ${building1.name}, ${building2.name}, ${building3.name}, ${building4.name}`);
  console.log(`  Deal: ${deal.name} (ID: ${deal.id})`);
  console.log('\nLogheaza-te cu broker@dunwell.ro / password si deschide deal-ul din /deals');
}

main()
  .catch((e) => {
    console.error('Demo seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
