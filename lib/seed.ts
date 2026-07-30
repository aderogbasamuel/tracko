import { PrismaClient } from "@prisma/client";
import { paymentReference } from "./reference";

const prisma = new PrismaClient();

/**
 * Demo data for the pitch. Shaped, not random, so the things we claim on stage
 * actually appear:
 *
 *   - two customers with a repeated late-payment pattern, so the credit-risk
 *     flag fires against real evidence rather than model guesswork
 *   - a cash-flow gap: far more owed this week than the ~₦10,000 sandbox balance
 *   - overdue debts of clearly different ages, so the "chase first" ordering
 *     visibly sorts
 *   - customers who pay on time, so "risky" means something by contrast
 */

const DAY = 86_400_000;
const at = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY);

interface Row {
  customerName: string;
  customerPhone: string;
  item: string;
  price: number;
  daysAgo: number;
  isCredit?: boolean;
  /** Days after the sale that payment was agreed for. */
  termDays?: number;
  /** Days after the sale the money actually arrived. Omit if still unpaid. */
  paidAfterDays?: number;
  partPaid?: number;
  delivered?: boolean;
}

const ROWS: Row[] = [
  // --- Chidi: chronic late payer. Always pays, always late. -----------------
  { customerName: "Chidi Okafor", customerPhone: "+2348031234567", item: "2 yards Ankara fabric", price: 8000, daysAgo: 40, isCredit: true, termDays: 14, paidAfterDays: 27, delivered: true },
  { customerName: "Chidi Okafor", customerPhone: "+2348031234567", item: "Men's kaftan", price: 15000, daysAgo: 26, isCredit: true, termDays: 14, paidAfterDays: 25, delivered: true },
  { customerName: "Chidi Okafor", customerPhone: "+2348031234567", item: "Bead necklace set", price: 4500, daysAgo: 9, isCredit: true, termDays: 7 }, // overdue now

  // --- Amaka: takes credit and is sitting on two overdue debts. ------------
  { customerName: "Amaka Nwosu", customerPhone: "+2348051234567", item: "Wig - closure style", price: 25000, daysAgo: 35, isCredit: true, termDays: 14, paidAfterDays: 30, delivered: true },
  { customerName: "Amaka Nwosu", customerPhone: "+2348051234567", item: "Handmade sandals", price: 9000, daysAgo: 24, isCredit: true, termDays: 14 }, // 10 days overdue
  { customerName: "Amaka Nwosu", customerPhone: "+2348051234567", item: "Perfume oil (30ml)", price: 3500, daysAgo: 12, isCredit: true, termDays: 7, partPaid: 1500 }, // part paid, overdue

  // --- Blessing: reliable. Pays early, every time. -------------------------
  { customerName: "Blessing Eze", customerPhone: "+2348061234567", item: "Bag of rice (5kg)", price: 6500, daysAgo: 30, isCredit: true, termDays: 14, paidAfterDays: 6, delivered: true },
  { customerName: "Blessing Eze", customerPhone: "+2348061234567", item: "Children's school bag", price: 7000, daysAgo: 16, isCredit: true, termDays: 14, paidAfterDays: 9, delivered: true },
  { customerName: "Blessing Eze", customerPhone: "+2348061234567", item: "2 yards Ankara fabric", price: 8000, daysAgo: 3, isCredit: true, termDays: 14 }, // due soon, not late

  // --- Big outstanding debts driving the cash-flow gap ---------------------
  { customerName: "Tunde Bakare", customerPhone: "+2348071234567", item: "Wig - closure style", price: 25000, daysAgo: 21, isCredit: true, termDays: 14 }, // 7 days overdue
  { customerName: "Fatima Bello", customerPhone: "+2348081234567", item: "Men's kaftan", price: 15000, daysAgo: 6, isCredit: true, termDays: 7 }, // just tipped over
  { customerName: "Ngozi Adeyemi", customerPhone: "+2348091234567", item: "Wig - frontal style", price: 32000, daysAgo: 5, isCredit: true, termDays: 7, partPaid: 10000 },

  // --- Straightforward cash sales, for contrast ----------------------------
  { customerName: "Samuel Aderogba", customerPhone: "+2348021234567", item: "Perfume oil (30ml)", price: 3500, daysAgo: 33, paidAfterDays: 0, delivered: true },
  { customerName: "Samuel Aderogba", customerPhone: "+2348021234567", item: "Bead necklace set", price: 4500, daysAgo: 18, paidAfterDays: 0, delivered: true },
  { customerName: "Yemi Balogun", customerPhone: "+2348101234567", item: "Handmade sandals", price: 9000, daysAgo: 14, paidAfterDays: 0, delivered: true },
  { customerName: "Ifeoma Uche", customerPhone: "+2348111234567", item: "Bag of rice (5kg)", price: 6500, daysAgo: 8, paidAfterDays: 0, delivered: true },
  { customerName: "Musa Danjuma", customerPhone: "+2348121234567", item: "Children's school bag", price: 7000, daysAgo: 4, paidAfterDays: 0 },
  { customerName: "Halima Sani", customerPhone: "+2348131234567", item: "2 yards Ankara fabric", price: 8000, daysAgo: 2 }, // awaiting payment
  { customerName: "Emeka Obi", customerPhone: "+2348141234567", item: "Men's kaftan", price: 15000, daysAgo: 1 }, // awaiting payment
  { customerName: "Grace Adamu", customerPhone: "+2348151234567", item: "Perfume oil (30ml)", price: 3500, daysAgo: 0, paidAfterDays: 0 },
];

function build(row: Row) {
  const createdAt = at(row.daysAgo);
  const isCredit = Boolean(row.isCredit);
  const dueDate = isCredit && row.termDays != null ? at(row.daysAgo - row.termDays) : null;

  const settled = row.paidAfterDays != null;
  const amountPaid = settled ? row.price : (row.partPaid ?? 0);
  const paidAt = settled ? at(row.daysAgo - row.paidAfterDays!) : null;

  let status: string;
  if (row.delivered && settled) status = "DELIVERED";
  else if (settled) status = "PAID";
  else if (amountPaid > 0) status = "PARTIALLY_PAID";
  else status = isCredit ? "CREDIT" : "PENDING";

  return {
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    item: row.item,
    price: row.price,
    status,
    isCredit,
    dueDate,
    amountPaid,
    createdAt,
    paidAt,
    deliveredAt: row.delivered && settled ? at(Math.max(0, row.daysAgo - row.paidAfterDays! - 1)) : null,
  };
}

async function seed() {
  console.log("Clearing existing orders...");
  await prisma.order.deleteMany();

  const rows = ROWS.map(build);
  console.log(`Inserting ${rows.length} orders...`);

  for (const row of rows) {
    const created = await prisma.order.create({ data: row as any });
    // Give unpaid orders a reference, as though payment had been requested.
    if (row.amountPaid < row.price) {
      await prisma.order.update({
        where: { id: created.id },
        data: { paymentRef: paymentReference(created.id) },
      });
    }
  }

  const outstanding = rows.reduce((sum, r) => sum + Math.max(0, r.price - r.amountPaid), 0);
  const overdue = rows.filter(
    (r) => r.dueDate && r.dueDate < new Date() && r.price - r.amountPaid > 0
  );

  console.log(`
Seed complete.
  Orders:             ${rows.length}
  Customers:          ${new Set(rows.map((r) => r.customerName)).size}
  Total outstanding:  ₦${outstanding.toLocaleString()}
  Overdue debts:      ${overdue.length}
  Expect the credit-risk flag to fire for Chidi and Amaka.`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
