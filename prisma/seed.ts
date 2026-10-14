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
    update: { grade: "A", harvestDate: new Date("2026-09-22T00:00:00Z"), availableUntil: new Date("2026-10-30T00:00:00Z") },
    create: { id: "listing-tomato", farmerId: farmer.id, crop: "Tomato", variety: "Hybrid", grade: "A", quantity: 420, unit: "kg", pricePerKg: 28, location: "Thondamuthur, Coimbatore", harvestDate: new Date("2026-09-22T00:00:00Z"), availableUntil: new Date("2026-10-30T00:00:00Z"), status: "ACTIVE" },
  });
  await prisma.listing.upsert({ where: { id: "listing-banana" }, update: { grade: "Freshly cut", harvestDate: new Date("2026-09-25T00:00:00Z") }, create: { id: "listing-banana", farmerId: farmer.id, crop: "Banana", variety: "Poovan", grade: "Freshly cut", quantity: 860, unit: "kg", pricePerKg: 42, location: "Pollachi, Coimbatore", harvestDate: new Date("2026-09-25T00:00:00Z"), status: "ACTIVE" } });
  await prisma.listing.upsert({ where: { id: "listing-rice" }, update: { grade: "A", harvestDate: new Date("2026-09-18T00:00:00Z") }, create: { id: "listing-rice", farmerId: farmer.id, crop: "Paddy", variety: "CO 51", grade: "A", quantity: 1200, unit: "kg", pricePerKg: 31, location: "Kumbakonam, Thanjavur", harvestDate: new Date("2026-09-18T00:00:00Z"), status: "ACTIVE" } });
  await prisma.listing.upsert({ where: { id: "listing-onion" }, update: { grade: "Cured", harvestDate: new Date("2026-09-24T00:00:00Z") }, create: { id: "listing-onion", farmerId: farmer.id, crop: "Onion", variety: "Small onion", grade: "Cured", quantity: 275, unit: "kg", pricePerKg: 56, location: "Palladam, Tiruppur", harvestDate: new Date("2026-09-24T00:00:00Z"), status: "ACTIVE" } });

  await prisma.order.upsert({ where: { id: "SA-2048" }, update: {}, create: { id: "SA-2048", listingId: tomato.id, buyerId: buyer.id, farmerId: farmer.id, quantity: 60, unitPrice: 28, total: 1680, status: "PLACED" } });
  const completed = await prisma.order.upsert({ where: { id: "SA-1988" }, update: {}, create: { id: "SA-1988", listingId: "listing-banana", buyerId: buyer.id, farmerId: farmer.id, quantity: 40, unitPrice: 42, total: 1680, status: "COMPLETED" } });
  await prisma.review.upsert({ where: { orderId: completed.id }, update: {}, create: { orderId: completed.id, buyerId: buyer.id, farmerId: farmer.id, rating: 5, body: "Clean produce and a smooth pickup.", status: "PENDING" } });

  await prisma.verificationSubmission.upsert({
    where: { id: "verification-demo" },
    update: {},
    create: { id: "verification-demo", farmerId: farmer.id, farmName: "Thondamuthur Growers", district: "Coimbatore", documentRef: "private://demo/farm-verification", status: "PENDING" },
  });
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