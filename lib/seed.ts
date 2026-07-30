import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const customers = [
  { name: "Chidi Okafor", phone: "+2348031234567" },
  { name: "Samuel Aderogba", phone: "+2348021234567" },
  { name: "Amaka Nwosu", phone: "+2348051234567" },
  { name: "Blessing Eze", phone: "+2348061234567" },
  { name: "Tunde Bakare", phone: "+2348071234567" },
  { name: "Fatima Bello", phone: "+2348081234567" },
];

const items = [
  { name: "2 yards Ankara fabric", price: 8000 },
  { name: "Bag of rice (5kg)", price: 6500 },
  { name: "Wig - closure style", price: 25000 },
  { name: "Men's kaftan", price: 15000 },
  { name: "Bead necklace set", price: 4500 },
  { name: "Perfume oil (30ml)", price: 3500 },
  { name: "Children's school bag", price: 7000 },
  { name: "Handmade sandals", price: 9000 },
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function seed() {
  console.log("Clearing existing orders...");
  await prisma.order.deleteMany();

  const orders = [];

  // Chidi and Samuel get repeat orders (so "top customer" insight has something to say)
  const repeatCustomers = [customers[0], customers[1]];

  for (const customer of repeatCustomers) {
    const numOrders = 3 + Math.floor(Math.random() * 2); // 3-4 orders each
    for (let i = 0; i < numOrders; i++) {
      const item = randomFrom(items);
      const daysBack = 20 - i * 5;
      const createdAt = daysAgo(daysBack);
      const isPaid = daysBack > 3; // older orders are paid, recent ones pending
      const isDelivered = isPaid && daysBack > 5;

      orders.push({
        customerName: customer.name,
        customerPhone: customer.phone,
        item: item.name,
        price: item.price,
        status: isDelivered ? "DELIVERED" : isPaid ? "PAID" : "PENDING",
        createdAt,
        paidAt: isPaid ? daysAgo(daysBack - 1) : null,
        deliveredAt: isDelivered ? daysAgo(daysBack - 2) : null,
      });
    }
  }

  // Remaining customers get 1 order each, mixed statuses
  const otherCustomers = customers.slice(2);
  const statuses: Array<"PENDING" | "PAID" | "DELIVERED"> = [
    "PENDING",
    "PAID",
    "DELIVERED",
    "PAID",
  ];

  otherCustomers.forEach((customer, i) => {
    const item = randomFrom(items);
    const daysBack = 1 + i * 3;
    const status = statuses[i % statuses.length];
    const createdAt = daysAgo(daysBack);
    const isPaid = status === "PAID" || status === "DELIVERED";
    const isDelivered = status === "DELIVERED";

    orders.push({
      customerName: customer.name,
      customerPhone: customer.phone,
      item: item.name,
      price: item.price,
      status,
      createdAt,
      paidAt: isPaid ? daysAgo(daysBack - 0.5) : null,
      deliveredAt: isDelivered ? daysAgo(daysBack - 1) : null,
    });
  });

  console.log(`Inserting ${orders.length} orders...`);

  for (const order of orders) {
    await prisma.order.create({ data: order as any });
  }

  console.log("Seed complete.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });