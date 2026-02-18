import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Comprehensive demo data for agency testing:
 * - 2 brokers (Ion Popescu + Maria Ionescu)
 * - 5 companies with realistic Romanian industrial data
 * - 8 contact persons with varied labels
 * - 4 buildings with real coordinates & multiple units
 * - 8 deals across ALL pipeline statuses
 * - Activities (calls, meetings, tours, notes, tasks)
 * - Tenants with expiring leases (for dashboard)
 * - Offers linked to deals
 * - Audit log entries for admin notifications
 */
async function main() {
  console.log('Seeding comprehensive demo data...');

  const hashedPassword = await bcrypt.hash('password', 10);

  // ── Get existing users & create second broker ─────────────────
  const broker1 = await prisma.user.findUnique({
    where: { email: 'broker@mapestate.eu' },
  });
  if (!broker1) {
    throw new Error('Broker user not found. Run main seed first.');
  }

  const admin = await prisma.user.findUnique({
    where: { email: 'admin@mapestate.eu' },
  });
  if (!admin) {
    throw new Error('Admin user not found. Run main seed first.');
  }

  // Second broker
  const broker2 = await prisma.user.upsert({
    where: { email: 'broker2@mapestate.eu' },
    update: { agencyId: 1 },
    create: {
      email: 'broker2@mapestate.eu',
      password: hashedPassword,
      firstName: 'Maria',
      lastName: 'Ionescu',
      phone: '+40722100200',
      role: Role.BROKER,
      agencyId: 1,
    },
  });
  console.log(`Created broker: ${broker2.email}`);

  // ── Get locations ─────────────────────────────────────────────
  const chiajna = await prisma.location.findFirst({ where: { name: 'Chiajna' } });
  const stefanesti = await prisma.location.findFirst({ where: { name: 'Stefăneștii de Jos' } });
  const pantelimon = await prisma.location.findFirst({ where: { name: 'Pantelimon' } });
  const otopeni = await prisma.location.findFirst({ where: { name: 'Otopeni' } });
  const bucuresti = await prisma.location.findFirst({ where: { name: 'București' } });

  if (!chiajna || !stefanesti || !pantelimon || !otopeni || !bucuresti) {
    throw new Error('Required locations not found. Run main seed first.');
  }

  // ── Companies ─────────────────────────────────────────────────
  const company1 = await prisma.company.create({
    data: {
      name: 'MASPEX ROMANIA SRL',
      vatNumber: 'RO12345678',
      jNumber: 'J40/1234/2015',
      address: 'Str. Industriei 15, Sector 3, București',
      openDeals: 2,
      userId: broker1.id,
    },
  });

  const company2 = await prisma.company.create({
    data: {
      name: 'CARREFOUR ROMANIA SA',
      vatNumber: 'RO672646',
      jNumber: 'J40/7766/2000',
      address: 'Bd. Timișoara 26, Sector 6, București',
      openDeals: 1,
      closedDeals: 1,
      userId: broker1.id,
    },
  });

  const company3 = await prisma.company.create({
    data: {
      name: 'FAN COURIER EXPRESS SRL',
      vatNumber: 'RO14674516',
      jNumber: 'J40/8295/2002',
      address: 'Sos. Fabrica de Glucoza 21, Sector 2, București',
      openDeals: 1,
      userId: broker2.id,
    },
  });

  const company4 = await prisma.company.create({
    data: {
      name: 'DEDEMAN SRL',
      vatNumber: 'RO4269287',
      jNumber: 'J04/517/1993',
      address: 'Str. Dreptatii 1, Bacau',
      openDeals: 1,
      userId: broker2.id,
    },
  });

  const company5 = await prisma.company.create({
    data: {
      name: 'PROFI ROM FOOD SRL',
      vatNumber: 'RO15102252',
      jNumber: 'J35/2766/2002',
      address: 'Calea Sever Bocu 31, Timișoara',
      closedDeals: 1,
      userId: broker1.id,
    },
  });

  console.log(`Created 5 companies`);

  // ── Persons ───────────────────────────────────────────────────
  const person1 = await prisma.person.create({
    data: {
      name: 'Andrei Marinescu',
      jobTitle: 'Logistics Director',
      emails: ['andrei.marinescu@maspex.ro', 'logistics@maspex.ro'],
      phones: ['+40727808355', '+40721555123'],
      source: 'Referral',
      companyId: company1.id,
      labelId: 1, // Customer
      openDeals: 2,
      userId: broker1.id,
    },
  });

  const person2 = await prisma.person.create({
    data: {
      name: 'Elena Dragomir',
      jobTitle: 'Procurement Manager',
      emails: ['elena.dragomir@carrefour.com'],
      phones: ['+40744332211'],
      source: 'Cold Call',
      companyId: company2.id,
      labelId: 1, // Customer
      openDeals: 1,
      closedDeals: 1,
      userId: broker1.id,
    },
  });

  const person3 = await prisma.person.create({
    data: {
      name: 'Mihai Constantinescu',
      jobTitle: 'Real Estate Manager',
      emails: ['mihai.c@fancourier.ro'],
      phones: ['+40733445566'],
      source: 'Website',
      companyId: company3.id,
      labelId: 1, // Customer
      openDeals: 1,
      userId: broker2.id,
    },
  });

  const person4 = await prisma.person.create({
    data: {
      name: 'Radu Stefanescu',
      jobTitle: 'Expansion Director',
      emails: ['radu.s@dedeman.ro', 'expansiune@dedeman.ro'],
      phones: ['+40755667788'],
      source: 'Conference',
      companyId: company4.id,
      labelId: 1, // Customer
      openDeals: 1,
      userId: broker2.id,
    },
  });

  const person5 = await prisma.person.create({
    data: {
      name: 'Victor Dumitrescu',
      jobTitle: 'CEO',
      emails: ['victor@equest.ro'],
      phones: ['+40722100200'],
      source: 'Referral',
      companyId: null,
      labelId: 2, // Landlord
      userId: broker1.id,
    },
  });

  const person6 = await prisma.person.create({
    data: {
      name: 'Ana Popa',
      jobTitle: 'Leasing Manager',
      emails: ['ana.popa@ctpinvest.eu'],
      phones: ['+40721334455'],
      source: 'LinkedIn',
      companyId: null,
      labelId: 2, // Landlord
      userId: broker1.id,
    },
  });

  const person7 = await prisma.person.create({
    data: {
      name: 'Cristian Barbu',
      jobTitle: 'Property Manager',
      emails: ['cristian.b@wdp.eu'],
      phones: ['+40744556677'],
      source: 'Event',
      companyId: null,
      labelId: 2, // Landlord
      userId: broker2.id,
    },
  });

  const person8 = await prisma.person.create({
    data: {
      name: 'Florin Neagu',
      jobTitle: 'Supply Chain Director',
      emails: ['florin.n@profi.ro'],
      phones: ['+40755112233'],
      source: 'Cold Call',
      companyId: company5.id,
      labelId: 3, // Tenant
      closedDeals: 1,
      userId: broker1.id,
    },
  });

  console.log(`Created 8 persons`);

  // ── Buildings ─────────────────────────────────────────────────
  const building1 = await prisma.building.create({
    data: {
      name: 'CTPark Bucharest West',
      propertyCode: 'CTP-BW-01',
      totalSqm: 45000,
      availableSqm: 12500,
      address: 'Str. Industriilor 5, Chiajna, Ilfov',
      latitude: 44.4355,
      longitude: 25.9680,
      transactionType: 'RENT_AND_SALE',
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
      userId: broker1.id,
      ownerName: 'CTP Invest Romania',
      ownerPhone: '+40 21 310 1500',
      ownerEmail: 'leasing@ctp.eu',
      minContractYears: 5,
    },
  });

  const unit1a = await prisma.unit.create({
    data: {
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
      salePrice: 2500000,
      salePriceVatIncluded: false,
      transactionType: 'RENT_AND_SALE',
      buildingId: building1.id,
      userId: broker1.id,
    },
  });

  const unit1b = await prisma.unit.create({
    data: {
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
      userId: broker1.id,
    },
  });
  console.log(`Created: ${building1.name} (2 units)`);

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
      userId: broker1.id,
      ownerName: 'WDP Romania',
      ownerPhone: '+40 21 527 8700',
      ownerEmail: 'romania@wdp.eu',
      minContractYears: 3,
    },
  });

  const unit2a = await prisma.unit.create({
    data: {
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
      userId: broker1.id,
    },
  });

  const unit2b = await prisma.unit.create({
    data: {
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
      userId: broker1.id,
    },
  });
  console.log(`Created: ${building2.name} (2 units)`);

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
      userId: broker2.id,
      ownerName: 'P3 Logistic Parks',
      ownerPhone: '+40 21 300 5600',
      ownerEmail: 'leasing.ro@p3parks.com',
      minContractYears: 5,
    },
  });

  const unit3a = await prisma.unit.create({
    data: {
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
      userId: broker2.id,
    },
  });

  await prisma.unit.create({
    data: {
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
      userId: broker2.id,
    },
  });
  console.log(`Created: ${building3.name} (2 units)`);

  const building4 = await prisma.building.create({
    data: {
      name: 'Equest Logistic Park',
      propertyCode: 'EQS-PNT-01',
      totalSqm: 22000,
      availableSqm: 6500,
      address: 'Sos. de Centura 23, Pantelimon, Ilfov',
      latitude: 44.4530,
      longitude: 26.2080,
      transactionType: 'RENT_AND_SALE',
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
      userId: broker2.id,
      ownerName: 'Equest Invest',
      ownerPhone: '+40 722 100 200',
      ownerEmail: 'office@equest.ro',
      minContractYears: 3,
    },
  });

  const unit4a = await prisma.unit.create({
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
      userId: broker2.id,
    },
  });

  // Sale-only unit
  await prisma.unit.create({
    data: {
      name: 'Depozit D3 - Vanzare',
      warehouseSpace: { sqm: 3200, rentPrice: 0 },
      docks: 2,
      driveins: 1,
      usefulHeight: 9.0,
      hasOffice: false,
      hasSanitary: true,
      sanitarySqm: 30,
      salePrice: 980000,
      salePriceVatIncluded: true,
      transactionType: 'SALE',
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
      buildingId: building4.id,
      userId: broker2.id,
    },
  });
  console.log(`Created: ${building4.name} (2 units)`);

  // ── Deals across ALL pipeline statuses ────────────────────────

  // Deal 1: NEW (Broker 1)
  const deal1 = await prisma.propertyRequest.create({
    data: {
      name: 'Maspex - Depozit Logistic Bucuresti',
      numberOfSqm: 8000,
      minHeight: 10.0,
      estimatedFeeValue: 25000,
      contractPeriod: 5,
      breakOptionAfter: 3,
      startDate: new Date('2026-04-01'),
      requestType: 'RENT',
      status: 'NEW',
      dealType: 'REQUEST',
      notes: 'Client cauta spatiu logistic clasa A pentru depozitare produse alimentare ambalate. Necesita minim 6 dockuri, sprinkler obligatoriu.',
      companyId: company1.id,
      personId: person1.id,
      userId: broker1.id,
      locations: { connect: [{ id: chiajna.id }, { id: stefanesti.id }] },
    },
  });

  // Deal 2: OFFERING (Broker 1)
  const deal2 = await prisma.propertyRequest.create({
    data: {
      name: 'Carrefour - Centru Distributie Zone Vest',
      numberOfSqm: 12000,
      minHeight: 10.0,
      estimatedFeeValue: 42000,
      contractPeriod: 7,
      breakOptionAfter: 5,
      startDate: new Date('2026-06-01'),
      requestType: 'RENT',
      status: 'OFFERING',
      dealType: 'REQUEST',
      notes: 'Carrefour cauta centru de distributie pentru zona de vest a Bucurestiului. Preferinta parc logistic cu certificare BREEAM.',
      companyId: company2.id,
      personId: person2.id,
      userId: broker1.id,
      locations: { connect: [{ id: chiajna.id }, { id: pantelimon.id }] },
    },
  });

  // Deal 3: TOUR (Broker 2)
  const deal3 = await prisma.propertyRequest.create({
    data: {
      name: 'Fan Courier - Hub Sortare Est',
      numberOfSqm: 6000,
      minHeight: 9.0,
      estimatedFeeValue: 18000,
      contractPeriod: 5,
      startDate: new Date('2026-05-01'),
      requestType: 'RENT',
      status: 'TOUR',
      dealType: 'REQUEST',
      notes: 'Fan Courier are nevoie de hub sortare in zona est Bucuresti. Cross-dock obligatoriu. Au vizitat deja 2 locatii.',
      companyId: company3.id,
      personId: person3.id,
      userId: broker2.id,
      locations: { connect: [{ id: pantelimon.id }, { id: stefanesti.id }] },
    },
  });

  // Deal 4: SHORTLIST (Broker 2)
  const deal4 = await prisma.propertyRequest.create({
    data: {
      name: 'Dedeman - Depozit Regional Sud',
      numberOfSqm: 15000,
      minHeight: 12.0,
      estimatedFeeValue: 55000,
      contractPeriod: 10,
      breakOptionAfter: 7,
      startDate: new Date('2026-09-01'),
      requestType: 'RENT',
      status: 'SHORTLIST',
      dealType: 'REQUEST',
      notes: 'Dedeman cauta depozit regional de peste 15.000 mp. Au ramas 2 optiuni pe shortlist: P3 si CTPark. Vizite programate saptamana viitoare.',
      companyId: company4.id,
      personId: person4.id,
      userId: broker2.id,
      locations: { connect: [{ id: chiajna.id }] },
    },
  });

  // Deal 5: NEGOTIATION (Broker 1)
  const deal5 = await prisma.propertyRequest.create({
    data: {
      name: 'Maspex - Extindere Depozit Chiajna',
      numberOfSqm: 5000,
      minHeight: 10.0,
      estimatedFeeValue: 15000,
      contractPeriod: 5,
      startDate: new Date('2026-07-01'),
      requestType: 'RENT',
      status: 'NEGOTIATION',
      dealType: 'COLD_SALES',
      notes: 'Maspex doreste extindere in CTPark Bucharest West. Negocieri avansate pe pret si termen contract. Proprietar dispus la 6 luni rent-free.',
      companyId: company1.id,
      personId: person1.id,
      userId: broker1.id,
      locations: { connect: [{ id: chiajna.id }] },
    },
  });

  // Deal 6: HOT_SIGNED (Broker 1)
  const deal6 = await prisma.propertyRequest.create({
    data: {
      name: 'Carrefour - Depozit Otopeni',
      numberOfSqm: 4000,
      minHeight: 8.0,
      estimatedFeeValue: 12000,
      contractPeriod: 3,
      startDate: new Date('2026-03-15'),
      requestType: 'RENT',
      status: 'HOT_SIGNED',
      dealType: 'REQUEST',
      lastStatusChange: new Date('2026-02-10'),
      notes: 'Contract semnat! Carrefour a inchiriat spatiu in Otopeni pentru fulfillment e-commerce. Mutare in martie.',
      companyId: company2.id,
      personId: person2.id,
      userId: broker1.id,
      locations: { connect: [{ id: otopeni.id }] },
    },
  });

  // Deal 7: WON (Broker 1)
  const deal7 = await prisma.propertyRequest.create({
    data: {
      name: 'Profi - Centru Distributie Bucuresti',
      numberOfSqm: 10000,
      minHeight: 10.0,
      estimatedFeeValue: 35000,
      contractPeriod: 7,
      startDate: new Date('2025-12-01'),
      requestType: 'RENT',
      status: 'WON',
      dealType: 'REQUEST',
      closedAt: new Date('2025-11-20'),
      lastStatusChange: new Date('2025-11-20'),
      notes: 'Deal castigat! Profi a semnat contract pe 7 ani in WDP Industrial Park. Fee incasat integral.',
      companyId: company5.id,
      personId: person8.id,
      userId: broker1.id,
      locations: { connect: [{ id: stefanesti.id }] },
    },
  });

  // Deal 8: LOST (Broker 2)
  await prisma.propertyRequest.create({
    data: {
      name: 'Fan Courier - Hub Sortare Nord',
      numberOfSqm: 3500,
      minHeight: 8.0,
      estimatedFeeValue: 8000,
      contractPeriod: 3,
      startDate: new Date('2026-01-15'),
      requestType: 'RENT',
      status: 'LOST',
      dealType: 'REQUEST',
      closedAt: new Date('2026-01-10'),
      lastStatusChange: new Date('2026-01-10'),
      lostReason: 'Clientul a ales o oferta de la un competitor cu un pret mai bun.',
      notes: 'Fan Courier a ales o alta agentie. Pret sub piata oferit de competitor.',
      companyId: company3.id,
      personId: person3.id,
      userId: broker2.id,
      locations: { connect: [{ id: otopeni.id }] },
    },
  });

  // Deal 9: ON_HOLD (Broker 2)
  await prisma.propertyRequest.create({
    data: {
      name: 'Dedeman - Showroom Bucuresti',
      numberOfSqm: 2000,
      minHeight: 6.0,
      estimatedFeeValue: 8000,
      contractPeriod: 5,
      startDate: new Date('2026-08-01'),
      requestType: 'RENT',
      status: 'ON_HOLD',
      dealType: 'COLD_SALES',
      lastStatusChange: new Date('2026-02-01'),
      notes: 'Dedeman a pus pe hold cautarea de showroom. Bugetul a fost redirectionat catre depozitul regional. Se reiau discutiile in T3.',
      companyId: company4.id,
      personId: person4.id,
      userId: broker2.id,
      locations: { connect: [{ id: bucuresti.id }] },
    },
  });

  console.log(`Created 9 deals (all pipeline statuses)`);

  // ── Offers ────────────────────────────────────────────────────
  const offer1 = await prisma.offer.create({
    data: {
      offerCode: 'OFF-2026-001',
      downloadable: true,
      sentAt: new Date('2026-02-05'),
      emailStatus: 'SENT',
      requestedSqm: 12000,
      requestedType: 'RENT',
      requestedStartDate: new Date('2026-06-01'),
      requestId: deal2.id,
      userId: broker1.id,
      companyId: company2.id,
      personId: person2.id,
    },
  });

  await prisma.offer.create({
    data: {
      offerCode: 'OFF-2026-002',
      downloadable: false,
      emailStatus: 'PENDING',
      requestedSqm: 8000,
      requestedType: 'RENT',
      requestedStartDate: new Date('2026-04-01'),
      requestId: deal1.id,
      userId: broker1.id,
      companyId: company1.id,
      personId: person1.id,
    },
  });

  await prisma.offer.create({
    data: {
      offerCode: 'OFF-2026-003',
      downloadable: true,
      sentAt: new Date('2026-01-20'),
      emailStatus: 'SENT',
      requestedSqm: 6000,
      requestedType: 'RENT',
      requestedStartDate: new Date('2026-05-01'),
      requestId: deal3.id,
      userId: broker2.id,
      companyId: company3.id,
      personId: person3.id,
    },
  });

  console.log(`Created 3 offers`);

  // ── Offer Groups (for sent offers) ────────────────────────────
  await prisma.offerGroup.create({
    data: {
      name: 'CTPark Bucharest West - Hala A1',
      status: 'READY',
      leaseTermMonths: 84,
      incentiveMonths: 3,
      startDate: new Date('2026-06-01'),
      warehouseSqm: 5000,
      warehouseRentPrice: 4.25,
      officeSqm: 250,
      officeRentPrice: 10.50,
      serviceCharge: 1.25,
      docks: 6,
      driveins: 2,
      address: building1.address,
      latitude: building1.latitude,
      longitude: building1.longitude,
      offerId: offer1.id,
      buildingId: building1.id,
    },
  });

  await prisma.offerGroup.create({
    data: {
      name: 'P3 Logistic Park - Sectiunea 1',
      status: 'READY',
      leaseTermMonths: 84,
      incentiveMonths: 6,
      startDate: new Date('2026-06-01'),
      warehouseSqm: 8000,
      warehouseRentPrice: 4.50,
      officeSqm: 500,
      officeRentPrice: 11.00,
      serviceCharge: 1.35,
      docks: 10,
      driveins: 2,
      address: building3.address,
      latitude: building3.latitude,
      longitude: building3.longitude,
      offerId: offer1.id,
      buildingId: building3.id,
    },
  });

  console.log(`Created 2 offer groups`);

  // ── Tenants (for expiring leases on dashboard) ────────────────
  await prisma.tenant.create({
    data: {
      startDate: new Date('2023-04-01'),
      endDate: new Date('2026-03-31'),  // Expiring soon!
      unitId: unit1a.id,
      companyId: company5.id,
    },
  });

  await prisma.tenant.create({
    data: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2026-04-30'),  // Expiring in ~2 months
      unitId: unit2a.id,
      companyId: company2.id,
    },
  });

  await prisma.tenant.create({
    data: {
      startDate: new Date('2022-06-01'),
      endDate: new Date('2026-05-31'),  // Expiring in ~3 months
      unitId: unit4a.id,
      companyId: company3.id,
    },
  });

  await prisma.tenant.create({
    data: {
      startDate: new Date('2021-09-01'),
      endDate: new Date('2028-08-31'),  // Long-term, not expiring
      unitId: unit3a.id,
      companyId: company1.id,
    },
  });

  console.log(`Created 4 tenants (3 expiring soon)`);

  // ── Activities ────────────────────────────────────────────────
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  // Broker 1 activities
  await prisma.activity.create({
    data: {
      title: 'Apel introductiv Maspex - discutie cerinte spatiu',
      date: daysAgo(14),
      time: '10:00',
      duration: 30,
      done: true,
      notes: 'Discutie initiala cu Andrei Marinescu despre cerinte: 8000mp, sprinkler, zona vest. Au trimis brief detaliat pe email.',
      activityType: 'CALL',
      userId: broker1.id,
      companyId: company1.id,
      requestId: deal1.id,
      persons: { connect: [{ id: person1.id }] },
    },
  });

  await prisma.activity.create({
    data: {
      title: 'Email oferta Carrefour - 2 optiuni prezentate',
      date: daysAgo(7),
      time: '14:00',
      done: true,
      notes: 'Trimis oferta cu 2 optiuni: CTPark Bucharest West (Hala A1) si P3 Logistic Park (Sectiunea 1). Clientul va reveni cu feedback.',
      activityType: 'EMAIL',
      userId: broker1.id,
      companyId: company2.id,
      requestId: deal2.id,
      persons: { connect: [{ id: person2.id }] },
    },
  });

  await prisma.activity.create({
    data: {
      title: 'Vizita proprietate CTPark cu Carrefour',
      date: daysAgo(3),
      time: '10:30',
      duration: 90,
      done: true,
      notes: 'Vizita cu Elena Dragomir la CTPark Bucharest West. Clientul impresionat de infrastructura. Urmeaza vizita P3.',
      activityType: 'TOUR',
      userId: broker1.id,
      companyId: company2.id,
      requestId: deal2.id,
      persons: { connect: [{ id: person2.id }] },
    },
  });

  await prisma.activity.create({
    data: {
      title: 'Intalnire negociere Maspex - extindere Chiajna',
      date: daysAgo(2),
      time: '15:00',
      duration: 60,
      done: true,
      notes: 'Negociere avansata cu Andrei si Ana Popa (CTP). Discutat rent-free 6 luni si optiune extindere. Proprietar flexibil pe termen.',
      activityType: 'MEETING',
      userId: broker1.id,
      companyId: company1.id,
      requestId: deal5.id,
      persons: { connect: [{ id: person1.id }, { id: person6.id }] },
    },
  });

  await prisma.activity.create({
    data: {
      title: 'Nota interna - strategie pricing Maspex',
      date: daysAgo(1),
      done: true,
      notes: 'Maspex poate merge pana la 4.50 EUR/mp warehouse. CTP cere 4.25 dar e dispus la 4.10 daca se semneaza pe 7 ani. Recomandat sa propunem 7 ani cu break la 5.',
      activityType: 'NOTE',
      userId: broker1.id,
      companyId: company1.id,
      requestId: deal5.id,
    },
  });

  await prisma.activity.create({
    data: {
      title: 'Task: Pregatire prezentare shortlist Carrefour',
      date: new Date(now.getTime() + 2 * 86400000), // 2 days from now
      time: '09:00',
      done: false,
      notes: 'De pregatit prezentare shortlist cu cele 2 optiuni ramase. Include poze, specificatii tehnice, comparativ preturi.',
      activityType: 'TASK',
      userId: broker1.id,
      companyId: company2.id,
      requestId: deal2.id,
    },
  });

  // Broker 2 activities
  await prisma.activity.create({
    data: {
      title: 'Vizita Equest Logistic Park cu Fan Courier',
      date: daysAgo(10),
      time: '11:00',
      duration: 120,
      done: true,
      notes: 'Vizita cu Mihai Constantinescu. Park ok ca locatie dar nu are cross-dock. Clientul prefera alta optiune.',
      activityType: 'TOUR',
      userId: broker2.id,
      companyId: company3.id,
      requestId: deal3.id,
      persons: { connect: [{ id: person3.id }] },
    },
  });

  await prisma.activity.create({
    data: {
      title: 'Vizita WDP Industrial Park cu Fan Courier',
      date: daysAgo(5),
      time: '10:00',
      duration: 90,
      done: true,
      notes: 'Vizita WDP cu Mihai. Compartimentul C4 nu are cross-dock, dar C3 poate fi adaptat. Clientul interesat, cere oferta.',
      activityType: 'TOUR',
      userId: broker2.id,
      companyId: company3.id,
      requestId: deal3.id,
      persons: { connect: [{ id: person3.id }] },
    },
  });

  await prisma.activity.create({
    data: {
      title: 'Apel Dedeman - discutie cerinte depozit regional',
      date: daysAgo(8),
      time: '16:00',
      duration: 45,
      done: true,
      notes: 'Radu Stefanescu a detaliat cerinte: min 15.000mp, inaltime 12m, dockuri 15+. Zona Chiajna preferata pentru acces A1.',
      activityType: 'CALL',
      userId: broker2.id,
      companyId: company4.id,
      requestId: deal4.id,
      persons: { connect: [{ id: person4.id }] },
    },
  });

  await prisma.activity.create({
    data: {
      title: 'Intalnire Dedeman - prezentare shortlist',
      date: daysAgo(1),
      time: '14:00',
      duration: 90,
      done: true,
      notes: 'Prezentat shortlist: CTPark (combinatie A1+A2 = 12.500mp) si P3 (Sectiunea 1 = 8.000mp + BTS). Dedeman prefera P3 dar cer 15.000mp garantati.',
      activityType: 'MEETING',
      userId: broker2.id,
      companyId: company4.id,
      requestId: deal4.id,
      persons: { connect: [{ id: person4.id }] },
    },
  });

  await prisma.activity.create({
    data: {
      title: 'Task: Trimite oferta actualizata Fan Courier',
      date: new Date(now.getTime() + 1 * 86400000), // tomorrow
      time: '10:00',
      done: false,
      notes: 'De trimis oferta actualizata cu WDP Compartiment C3 + adaptare cross-dock. Include cost estimat amenajare.',
      activityType: 'TASK',
      userId: broker2.id,
      companyId: company3.id,
      requestId: deal3.id,
    },
  });

  await prisma.activity.create({
    data: {
      title: 'Task: Follow-up Dedeman - P3 BTS',
      date: new Date(now.getTime() + 3 * 86400000), // 3 days from now
      time: '11:00',
      done: false,
      notes: 'Suna P3 pentru a discuta optiuni build-to-suit 15.000mp pentru Dedeman. De verificat timeline si preturi BTS.',
      activityType: 'TASK',
      userId: broker2.id,
      companyId: company4.id,
      requestId: deal4.id,
    },
  });

  console.log(`Created 13 activities`);

  // ── Audit Logs (for admin notification dropdown) ──────────────
  const auditEntries = [
    { action: 'CREATE', entity: 'DEAL', entityId: deal1.id, userId: broker1.id, details: { name: deal1.name }, createdAt: daysAgo(14) },
    { action: 'CREATE', entity: 'COMPANY', entityId: company1.id, userId: broker1.id, details: { name: company1.name }, createdAt: daysAgo(14) },
    { action: 'CREATE', entity: 'PERSON', entityId: person1.id, userId: broker1.id, details: { name: person1.name }, createdAt: daysAgo(14) },
    { action: 'CREATE', entity: 'DEAL', entityId: deal2.id, userId: broker1.id, details: { name: deal2.name }, createdAt: daysAgo(10) },
    { action: 'CREATE', entity: 'COMPANY', entityId: company2.id, userId: broker1.id, details: { name: company2.name }, createdAt: daysAgo(10) },
    { action: 'STATUS_CHANGE', entity: 'DEAL', entityId: deal2.id, userId: broker1.id, details: { name: deal2.name, from: 'NEW', to: 'OFFERING' }, createdAt: daysAgo(7) },
    { action: 'CREATE', entity: 'OFFER', entityId: offer1.id, userId: broker1.id, details: { name: 'OFF-2026-001' }, createdAt: daysAgo(7) },
    { action: 'CREATE', entity: 'DEAL', entityId: deal3.id, userId: broker2.id, details: { name: deal3.name }, createdAt: daysAgo(12) },
    { action: 'CREATE', entity: 'COMPANY', entityId: company3.id, userId: broker2.id, details: { name: company3.name }, createdAt: daysAgo(12) },
    { action: 'STATUS_CHANGE', entity: 'DEAL', entityId: deal3.id, userId: broker2.id, details: { name: deal3.name, from: 'OFFERING', to: 'TOUR' }, createdAt: daysAgo(5) },
    { action: 'CREATE', entity: 'DEAL', entityId: deal4.id, userId: broker2.id, details: { name: deal4.name }, createdAt: daysAgo(9) },
    { action: 'STATUS_CHANGE', entity: 'DEAL', entityId: deal4.id, userId: broker2.id, details: { name: deal4.name, from: 'TOUR', to: 'SHORTLIST' }, createdAt: daysAgo(1) },
    { action: 'CREATE', entity: 'DEAL', entityId: deal5.id, userId: broker1.id, details: { name: deal5.name }, createdAt: daysAgo(6) },
    { action: 'STATUS_CHANGE', entity: 'DEAL', entityId: deal5.id, userId: broker1.id, details: { name: deal5.name, from: 'OFFERING', to: 'NEGOTIATION' }, createdAt: daysAgo(2) },
    { action: 'STATUS_CHANGE', entity: 'DEAL', entityId: deal6.id, userId: broker1.id, details: { name: deal6.name, from: 'NEGOTIATION', to: 'HOT_SIGNED' }, createdAt: daysAgo(8) },
    { action: 'STATUS_CHANGE', entity: 'DEAL', entityId: deal7.id, userId: broker1.id, details: { name: deal7.name, from: 'HOT_SIGNED', to: 'WON' }, createdAt: new Date('2025-11-20') },
    { action: 'CREATE', entity: 'BUILDING', entityId: building3.id, userId: broker2.id, details: { name: building3.name }, createdAt: daysAgo(11) },
    { action: 'CREATE', entity: 'BUILDING', entityId: building4.id, userId: broker2.id, details: { name: building4.name }, createdAt: daysAgo(11) },
    { action: 'UPDATE', entity: 'BUILDING', entityId: building1.id, userId: broker1.id, details: { name: building1.name, field: 'availableSqm' }, createdAt: daysAgo(3) },
    { action: 'REASSIGN', entity: 'DEAL', entityId: deal3.id, userId: admin!.id, details: { name: deal3.name, from: 'Ion Popescu', to: 'Maria Ionescu' }, createdAt: daysAgo(13) },
  ];

  for (const entry of auditEntries) {
    await prisma.auditLog.create({ data: entry });
  }
  console.log(`Created ${auditEntries.length} audit log entries`);

  // ── Summary ───────────────────────────────────────────────────
  console.log('\n=== Demo data seeded successfully! ===');
  console.log(`  Brokers: Ion Popescu (broker@), Maria Ionescu (broker2@)`);
  console.log(`  Companies: 5 (Maspex, Carrefour, Fan Courier, Dedeman, Profi)`);
  console.log(`  Persons: 8 (4 customers, 3 landlords, 1 tenant)`);
  console.log(`  Buildings: 4 (CTPark, WDP, P3, Equest) with 7 units`);
  console.log(`  Deals: 9 (NEW, OFFERING, TOUR, SHORTLIST, NEGOTIATION, HOT_SIGNED, ON_HOLD, WON, LOST)`);
  console.log(`  Offers: 3 (1 PENDING, 2 SENT)`);
  console.log(`  Offer Groups: 2`);
  console.log(`  Tenants: 4 (3 expiring within 3 months)`);
  console.log(`  Activities: 13 (calls, emails, tours, meetings, notes, tasks)`);
  console.log(`  Audit Logs: ${auditEntries.length}`);
  console.log('\nLogin: broker@mapestate.eu / password (or broker2@, admin@)');
}

main()
  .catch((e) => {
    console.error('Demo seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
