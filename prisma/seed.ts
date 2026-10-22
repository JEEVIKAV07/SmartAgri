import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const demoPassword = process.env.DEMO_PASSWORD ?? "Harvest!2026";

async function main() {
  const passwordHash = await hash(demoPassword, 12);
  const farmer = await prisma.user.upsert({
    where: { email: "farmer@vayal.test" },
    update: { passwordHash, name: "Malar Selvan", role: "FARMER", locale: "en", village: "Thondamuthur" },
    create: { id: "demo-farmer", email: "farmer@vayal.test", passwordHash, name: "Malar Selvan", role: "FARMER", locale: "en", village: "Thondamuthur" },
  });
  const kannan = await prisma.user.upsert({
    where: { email: "kannan@vayal.test" },
    update: { passwordHash, name: "Kannan Farms", role: "FARMER", locale: "en", village: "Pollachi" },
    create: { id: "demo-kannan", email: "kannan@vayal.test", passwordHash, name: "Kannan Farms", role: "FARMER", locale: "en", village: "Pollachi" },
  });
  const murugan = await prisma.user.upsert({
    where: { email: "murugan@vayal.test" },
    update: { passwordHash, name: "R. Murugan", role: "FARMER", locale: "en", village: "Kumbakonam" },
    create: { id: "demo-murugan", email: "murugan@vayal.test", passwordHash, name: "R. Murugan", role: "FARMER", locale: "en", village: "Kumbakonam" },
  });
  const thenmozhi = await prisma.user.upsert({
    where: { email: "thenmozhi@vayal.test" },
    update: { passwordHash, name: "Thenmozhi Collective", role: "FARMER", locale: "en", village: "Palladam" },
    create: { id: "demo-thenmozhi", email: "thenmozhi@vayal.test", passwordHash, name: "Thenmozhi Collective", role: "FARMER", locale: "en", village: "Palladam" },
  });
  const buyer = await prisma.user.upsert({
    where: { email: "buyer@vayal.test" },
    update: { passwordHash, name: "Kovai Fresh Mart", role: "BUYER", locale: "en" },
    create: { id: "demo-buyer", email: "buyer@vayal.test", passwordHash, name: "Kovai Fresh Mart", role: "BUYER", locale: "en" },
  });
  const admin = await prisma.user.upsert({
    where: { email: "admin@vayal.test" },
    update: { passwordHash, name: "Platform admin", role: "ADMIN", locale: "en" },
    create: { id: "demo-admin", email: "admin@vayal.test", passwordHash, name: "Platform admin", role: "ADMIN", locale: "en" },
  });

  const tomato = await prisma.listing.upsert({
    where: { id: "listing-tomato" },
    update: { grade: "A", harvestDate: new Date("2026-09-22T00:00:00Z"), availableUntil: new Date("2026-10-30T00:00:00Z"), status: "REMOVED" },
    create: { id: "listing-tomato", farmerId: farmer.id, crop: "Tomato", variety: "Hybrid", grade: "A", quantity: 420, unit: "kg", pricePerKg: 28, location: "Thondamuthur, Coimbatore", harvestDate: new Date("2026-09-22T00:00:00Z"), availableUntil: new Date("2026-10-30T00:00:00Z"), status: "REMOVED" },
  });
  await prisma.listing.upsert({ where: { id: "listing-banana" }, update: { farmerId: kannan.id, grade: "Freshly cut", harvestDate: new Date("2026-09-25T00:00:00Z"), status: "REMOVED" }, create: { id: "listing-banana", farmerId: kannan.id, crop: "Banana", variety: "Poovan", grade: "Freshly cut", quantity: 860, unit: "kg", pricePerKg: 42, location: "Pollachi, Coimbatore", harvestDate: new Date("2026-09-25T00:00:00Z"), status: "REMOVED" } });
  await prisma.listing.upsert({ where: { id: "listing-rice" }, update: { farmerId: murugan.id, grade: "A", harvestDate: new Date("2026-09-18T00:00:00Z"), status: "REMOVED" }, create: { id: "listing-rice", farmerId: murugan.id, crop: "Paddy", variety: "CO 51", grade: "A", quantity: 1200, unit: "kg", pricePerKg: 31, location: "Kumbakonam, Thanjavur", harvestDate: new Date("2026-09-18T00:00:00Z"), status: "REMOVED" } });
  await prisma.listing.upsert({ where: { id: "listing-onion" }, update: { farmerId: thenmozhi.id, grade: "Cured", harvestDate: new Date("2026-09-24T00:00:00Z"), status: "REMOVED" }, create: { id: "listing-onion", farmerId: thenmozhi.id, crop: "Onion", variety: "Small onion", grade: "Cured", quantity: 275, unit: "kg", pricePerKg: 56, location: "Palladam, Tiruppur", harvestDate: new Date("2026-09-24T00:00:00Z"), status: "REMOVED" } });

  await prisma.order.upsert({ where: { id: "SA-2048" }, update: {}, create: { id: "SA-2048", listingId: tomato.id, buyerId: buyer.id, farmerId: farmer.id, quantity: 60, unitPrice: 28, total: 1680, status: "PLACED" } });
  const completed = await prisma.order.upsert({ where: { id: "SA-1988" }, update: { farmerId: kannan.id }, create: { id: "SA-1988", listingId: "listing-banana", buyerId: buyer.id, farmerId: kannan.id, quantity: 40, unitPrice: 42, total: 1680, status: "COMPLETED" } });
  await prisma.review.upsert({ where: { orderId: completed.id }, update: { farmerId: kannan.id }, create: { orderId: completed.id, buyerId: buyer.id, farmerId: kannan.id, rating: 5, body: "Clean produce and a smooth pickup.", status: "PENDING" } });

  const conversation = await prisma.conversation.upsert({
    where: { id: `${buyer.id}:${tomato.id}` },
    update: {},
    create: { id: `${buyer.id}:${tomato.id}`, buyerId: buyer.id, farmerId: farmer.id, listingId: tomato.id },
  });
  if (!(await prisma.message.count({ where: { conversationId: conversation.id } }))) {
    await prisma.message.create({ data: { conversationId: conversation.id, senderId: farmer.id, body: "Vanakkam! Tomatoes are ready for pickup from tomorrow morning." } });
  }
  console.log(`Seeded demo users. Password: ${demoPassword}`);
  console.log(`Admin account: ${admin.email}`);
}

main().finally(() => prisma.$disconnect());