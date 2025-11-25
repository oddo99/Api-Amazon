
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAccounts() {
    const accounts = await prisma.account.findMany();
    console.log('Accounts found:', accounts.length);
    accounts.forEach(a => {
        console.log(`ID: ${a.id} | Name: ${a.name} | Region: ${a.region} | SellerId: ${a.sellerId}`);
    });
}

listAccounts();
