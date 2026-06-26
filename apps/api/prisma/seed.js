"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * SmartERP Database Seed
 * Creates: default voucher types, an admin user, and a demo company
 * Run: npm run prisma:seed
 */
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function seedVoucherTypes() {
    const types = [
        { code: client_1.VoucherTypeCode.PURCHASE, name: 'Purchase Voucher', description: 'Records purchases from suppliers' },
        { code: client_1.VoucherTypeCode.SALES, name: 'Sales Voucher', description: 'Records sales to customers' },
        { code: client_1.VoucherTypeCode.RECEIPT, name: 'Receipt Voucher', description: 'Records incoming payments' },
        { code: client_1.VoucherTypeCode.PAYMENT, name: 'Payment Voucher', description: 'Records outgoing payments' },
        { code: client_1.VoucherTypeCode.JOURNAL, name: 'Journal Voucher', description: 'Accounting adjustments' },
        { code: client_1.VoucherTypeCode.CONTRA, name: 'Contra Voucher', description: 'Cash ↔ Bank transfers' },
        { code: client_1.VoucherTypeCode.CREDIT_NOTE, name: 'Credit Note', description: 'Sales return' },
        { code: client_1.VoucherTypeCode.DEBIT_NOTE, name: 'Debit Note', description: 'Purchase return' },
    ];
    for (const t of types) {
        await prisma.voucherType.upsert({
            where: { code: t.code },
            update: { name: t.name, description: t.description, isActive: true },
            create: t,
        });
    }
    console.log(`✅ Seeded ${types.length} voucher types`);
}
async function seedAdminAndDemo() {
    const adminEmail = 'admin@smarterp.com';
    const adminPassword = 'Admin@12345';
    const passwordHash = await bcrypt_1.default.hash(adminPassword, 12);
    // Admin user
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: { isActive: true, emailVerified: true },
        create: {
            name: 'SmartERP Admin',
            email: adminEmail,
            passwordHash,
            isActive: true,
            emailVerified: true,
        },
    });
    console.log(`✅ Admin user: ${adminEmail} / ${adminPassword}`);
    // Demo company
    const existingCompany = await prisma.company.findFirst({
        where: { createdById: admin.id, name: 'Demo Company Pvt Ltd' },
    });
    if (!existingCompany) {
        const fyStart = new Date(new Date().getFullYear(), 3, 1); // April 1
        const fyEnd = new Date(fyStart);
        fyEnd.setFullYear(fyStart.getFullYear() + 1);
        fyEnd.setDate(fyEnd.getDate() - 1); // March 31
        const company = await prisma.company.create({
            data: {
                name: 'Demo Company Pvt Ltd',
                address: '123 Business Park, Mumbai, Maharashtra',
                contactNumber: '+91 98765 43210',
                email: 'contact@democompany.com',
                gstNumber: '27AABCU9603R1ZM',
                panNumber: 'AABCU9603R',
                state: 'Maharashtra',
                stateCode: '27',
                financialYearStart: fyStart,
                financialYearEnd: fyEnd,
                createdById: admin.id,
            },
        });
        // Admin role in company
        await prisma.userCompanyRole.create({
            data: { userId: admin.id, companyId: company.id, role: client_1.UserRole.ADMIN },
        });
        // Default financial year
        await prisma.financialYear.create({
            data: {
                companyId: company.id,
                yearName: `${fyStart.getFullYear()}-${(fyStart.getFullYear() + 1).toString().slice(-2)}`,
                startDate: fyStart,
                endDate: fyEnd,
                isCurrent: true,
            },
        });
        // Default ledger groups
        const ledgerGroups = [
            { name: 'Assets', groupType: client_1.GroupType.ASSET },
            { name: 'Liabilities', groupType: client_1.GroupType.LIABILITY },
            { name: 'Income', groupType: client_1.GroupType.INCOME },
            { name: 'Expenses', groupType: client_1.GroupType.EXPENSE },
            { name: 'Capital', groupType: client_1.GroupType.LIABILITY },
            { name: 'Sundry Debtors', groupType: client_1.GroupType.ASSET, parent: 'Assets' },
            { name: 'Sundry Creditors', groupType: client_1.GroupType.LIABILITY, parent: 'Liabilities' },
            { name: 'Sales Account', groupType: client_1.GroupType.INCOME, parent: 'Income' },
            { name: 'Purchase Account', groupType: client_1.GroupType.EXPENSE, parent: 'Expenses' },
            { name: 'Cash', groupType: client_1.GroupType.ASSET, parent: 'Assets' },
            { name: 'Bank', groupType: client_1.GroupType.ASSET, parent: 'Assets' },
            { name: 'Duties & Taxes', groupType: client_1.GroupType.LIABILITY, parent: 'Liabilities' },
        ];
        const groupIdMap = new Map();
        for (const g of ledgerGroups) {
            const created = await prisma.ledgerGroup.create({
                data: {
                    companyId: company.id,
                    name: g.name,
                    groupType: g.groupType,
                    parentGroupId: g.parent ? groupIdMap.get(g.parent) : null,
                },
            });
            groupIdMap.set(g.name, created.id);
        }
        console.log(`✅ Demo company created with ${ledgerGroups.length} ledger groups`);
        // Default units
        const units = [
            { name: 'PCS', symbol: 'pcs', decimals: 0 },
            { name: 'KG', symbol: 'kg', decimals: 3 },
            { name: 'LTR', symbol: 'L', decimals: 2 },
            { name: 'BOX', symbol: 'box', decimals: 0 },
            { name: 'MTR', symbol: 'm', decimals: 2 },
            { name: 'DOZ', symbol: 'dz', decimals: 0 },
        ];
        for (const u of units) {
            await prisma.unit.create({ data: { ...u, companyId: company.id } });
        }
        console.log(`✅ Seeded ${units.length} units`);
        // Default stock group
        const stockGroup = await prisma.stockGroup.create({
            data: { companyId: company.id, name: 'General' },
        });
        console.log(`✅ Created default stock group`);
        // System ledgers (used by voucher engine)
        const cashGroupId = groupIdMap.get('Cash');
        const bankGroupId = groupIdMap.get('Bank');
        const salesGroupId = groupIdMap.get('Sales Account');
        const purchaseGroupId = groupIdMap.get('Purchase Account');
        await prisma.ledger.createMany({
            data: [
                { companyId: company.id, ledgerGroupId: cashGroupId, name: 'Cash in Hand', isSystem: true },
                { companyId: company.id, ledgerGroupId: bankGroupId, name: 'Bank', isSystem: true },
                { companyId: company.id, ledgerGroupId: salesGroupId, name: 'Sales', isSystem: true },
                { companyId: company.id, ledgerGroupId: purchaseGroupId, name: 'Purchase', isSystem: true },
            ],
        });
        console.log(`✅ Created system ledgers (Cash, Bank, Sales, Purchase)`);
        return company;
    }
    else {
        console.log(`⏭️  Demo company already exists`);
        return existingCompany;
    }
}
async function main() {
    console.log('🌱 Seeding SmartERP database...\n');
    await seedVoucherTypes();
    const company = await seedAdminAndDemo();
    console.log(`\n🎉 Seed complete! Company: ${company.name}`);
    console.log(`\n📝 Login credentials:`);
    console.log(`   Email:    admin@smarterp.com`);
    console.log(`   Password: Admin@12345\n`);
}
main()
    .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map