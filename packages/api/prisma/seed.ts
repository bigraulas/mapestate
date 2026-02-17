import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('password', 10);

  // Create default agency (replaces AgencySettings)
  const agency = await prisma.agency.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Dunwell',
      address: '218 Calea Floreasca, District 1, Bucharest, Romania',
      phone: '+40 (0) 723 456 789',
      email: 'office@dunwell.ro',
      website: 'www.dunwell.ro',
      primaryColor: '#0d9488',
    },
  });
  console.log(`Created agency: ${agency.name}`);

  // Create platform admin (no agency)
  const platformAdmin = await prisma.user.upsert({
    where: { email: 'platform@dunwell.ro' },
    update: {},
    create: {
      email: 'platform@dunwell.ro',
      password: hashedPassword,
      firstName: 'Platform',
      lastName: 'Admin',
      phone: '+40721000099',
      role: Role.PLATFORM_ADMIN,
      agencyId: null,
    },
  });
  console.log(`Created platform admin: ${platformAdmin.email}`);

  // Create admin user (belongs to Dunwell agency)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dunwell.ro' },
    update: { agencyId: 1 },
    create: {
      email: 'admin@dunwell.ro',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Dunwell',
      phone: '+40721000000',
      role: Role.ADMIN,
      agencyId: 1,
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // Create broker user (belongs to Dunwell agency)
  const broker = await prisma.user.upsert({
    where: { email: 'broker@dunwell.ro' },
    update: { agencyId: 1 },
    create: {
      email: 'broker@dunwell.ro',
      password: hashedPassword,
      firstName: 'Ion',
      lastName: 'Popescu',
      phone: '+40721000001',
      role: Role.BROKER,
      agencyId: 1,
    },
  });
  console.log(`Created broker user: ${broker.email}`);

  // Create labels
  const labels = [
    { name: 'Customer', color: '#3B82F6' },
    { name: 'Landlord', color: '#8B5CF6' },
    { name: 'Tenant', color: '#10B981' },
    { name: 'Developer', color: '#F59E0B' },
    { name: 'Consultant', color: '#EF4444' },
  ];

  for (const label of labels) {
    await prisma.label.upsert({
      where: { id: labels.indexOf(label) + 1 },
      update: {},
      create: label,
    });
  }
  console.log(`Created ${labels.length} labels`);

  // Create Romanian locations (major industrial cities)
  const locations = [
    { name: 'București', county: 'București' },
    { name: 'Chiajna', county: 'Ilfov' },
    { name: 'Bragadiru', county: 'Ilfov' },
    { name: 'Otopeni', county: 'Ilfov' },
    { name: 'Pantelimon', county: 'Ilfov' },
    { name: 'Mogoșoaia', county: 'Ilfov' },
    { name: 'Voluntari', county: 'Ilfov' },
    { name: 'Popești-Leordeni', county: 'Ilfov' },
    { name: 'Buftea', county: 'Ilfov' },
    { name: 'Măgurele', county: 'Ilfov' },
    { name: 'Tunari', county: 'Ilfov' },
    { name: 'Stefăneștii de Jos', county: 'Ilfov' },
    { name: 'Bolintin-Vale', county: 'Giurgiu' },
    { name: 'Cluj-Napoca', county: 'Cluj' },
    { name: 'Florești', county: 'Cluj' },
    { name: 'Apahida', county: 'Cluj' },
    { name: 'Gilău', county: 'Cluj' },
    { name: 'Turda', county: 'Cluj' },
    { name: 'Dej', county: 'Cluj' },
    { name: 'Timișoara', county: 'Timiș' },
    { name: 'Giroc', county: 'Timiș' },
    { name: 'Ghiroda', county: 'Timiș' },
    { name: 'Dumbrăvița', county: 'Timiș' },
    { name: 'Arad', county: 'Arad' },
    { name: 'Curtici', county: 'Arad' },
    { name: 'Ineu', county: 'Arad' },
    { name: 'Constanța', county: 'Constanța' },
    { name: 'Ovidiu', county: 'Constanța' },
    { name: 'Agigea', county: 'Constanța' },
    { name: 'Brașov', county: 'Brașov' },
    { name: 'Ghimbav', county: 'Brașov' },
    { name: 'Cristian', county: 'Brașov' },
    { name: 'Codlea', county: 'Brașov' },
    { name: 'Sibiu', county: 'Sibiu' },
    { name: 'Șelimbăr', county: 'Sibiu' },
    { name: 'Cisnădie', county: 'Sibiu' },
    { name: 'Oradea', county: 'Bihor' },
    { name: 'Borș', county: 'Bihor' },
    { name: 'Craiova', county: 'Dolj' },
    { name: 'Iași', county: 'Iași' },
    { name: 'Miroslava', county: 'Iași' },
    { name: 'Pitești', county: 'Argeș' },
    { name: 'Ploiești', county: 'Prahova' },
    { name: 'Deva', county: 'Hunedoara' },
    { name: 'Râmnicu Vâlcea', county: 'Vâlcea' },
    { name: 'Bacău', county: 'Bacău' },
    { name: 'Suceava', county: 'Suceava' },
    { name: 'Bistrița', county: 'Bistrița-Năsăud' },
    { name: 'Alba Iulia', county: 'Alba' },
    { name: 'Târgu Mureș', county: 'Mureș' },
  ];

  // Only create locations if table is empty (avoid duplicates on re-seed)
  const existingLocations = await prisma.location.count();
  if (existingLocations === 0) {
    for (const loc of locations) {
      await prisma.location.create({ data: loc });
    }
    console.log(`Created ${locations.length} locations`);
  } else {
    console.log(`Locations already exist (${existingLocations}), skipping`);
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
