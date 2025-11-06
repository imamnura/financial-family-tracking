import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireFamily } from '@/lib/auth';
import { PrismaErrorHandler } from '@/lib/prisma-helpers';

/**
 * Wallet Transfer Schema
 */
const WalletTransferSchema = z.object({
  fromWalletId: z.string().uuid('From Wallet ID tidak valid'),
  toWalletId: z.string().uuid('To Wallet ID tidak valid'),
  amount: z
    .number()
    .positive('Jumlah transfer harus lebih dari 0')
    .max(999999999999, 'Jumlah transfer terlalu besar'),
  description: z
    .string()
    .max(500, 'Deskripsi maksimal 500 karakter')
    .optional(),
  date: z
    .string()
    .datetime({ message: 'Format tanggal tidak valid' })
    .or(z.date())
    .optional()
    .default(() => new Date().toISOString()),
});

type WalletTransferInput = z.infer<typeof WalletTransferSchema>;

/**
 * POST /api/wallets/transfer
 * 
 * Transfer money between wallets within the same family
 * 
 * Request body:
 * {
 *   fromWalletId: string,
 *   toWalletId: string,
 *   amount: number,
 *   description?: string,
 *   date?: string | Date
 * }
 * 
 * Response:
 * {
 *   transfer: {
 *     fromWallet: {...},
 *     toWallet: {...},
 *     amount: number,
 *     transactions: [...]
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get current session
    const session = await requireAuth();
    
    // Ensure user has a family
    await requireFamily(session);

    // Parse and validate request body
    const body = await request.json();
    const validatedData: WalletTransferInput = WalletTransferSchema.parse(body);

    const { fromWalletId, toWalletId, amount, description, date } = validatedData;

    // Validate different wallets
    if (fromWalletId === toWalletId) {
      return NextResponse.json(
        {
          error: 'Tidak dapat transfer ke dompet yang sama',
          code: 'SAME_WALLET',
        },
        { status: 400 }
      );
    }

    // Fetch both wallets and verify they belong to the same family
    const [fromWallet, toWallet] = await Promise.all([
      prisma.wallet.findUnique({
        where: { id: fromWalletId },
        select: { 
          id: true, 
          name: true, 
          balance: true, 
          familyId: true 
        },
      }),
      prisma.wallet.findUnique({
        where: { id: toWalletId },
        select: { 
          id: true, 
          name: true, 
          balance: true, 
          familyId: true 
        },
      }),
    ]);

    // Validate from wallet exists
    if (!fromWallet) {
      return NextResponse.json(
        {
          error: 'Dompet sumber tidak ditemukan',
          code: 'FROM_WALLET_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Validate to wallet exists
    if (!toWallet) {
      return NextResponse.json(
        {
          error: 'Dompet tujuan tidak ditemukan',
          code: 'TO_WALLET_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Validate both wallets belong to user's family
    if (fromWallet.familyId !== session.familyId) {
      return NextResponse.json(
        {
          error: 'Dompet sumber tidak ditemukan dalam keluarga Anda',
          code: 'FROM_WALLET_NOT_IN_FAMILY',
        },
        { status: 403 }
      );
    }

    if (toWallet.familyId !== session.familyId) {
      return NextResponse.json(
        {
          error: 'Dompet tujuan tidak ditemukan dalam keluarga Anda',
          code: 'TO_WALLET_NOT_IN_FAMILY',
        },
        { status: 403 }
      );
    }

    // Validate sufficient balance
    if (fromWallet.balance < amount) {
      return NextResponse.json(
        {
          error: 'Saldo tidak mencukupi untuk transfer',
          code: 'INSUFFICIENT_BALANCE',
          details: {
            available: fromWallet.balance,
            required: amount,
          },
        },
        { status: 400 }
      );
    }

    // Get or create "Transfer" category
    let transferCategory = await prisma.category.findFirst({
      where: {
        familyId: session.familyId!,
        name: 'Transfer',
        type: 'EXPENSE',
      },
    });

    if (!transferCategory) {
      transferCategory = await prisma.category.create({
        data: {
          name: 'Transfer',
          description: 'Transfer antar dompet',
          type: 'EXPENSE',
          icon: '💸',
          familyId: session.familyId!,
        },
      });
    }

    // Perform atomic transfer using transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Decrease balance from source wallet
      const updatedFromWallet = await tx.wallet.update({
        where: { id: fromWalletId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      // 2. Increase balance to destination wallet
      const updatedToWallet = await tx.wallet.update({
        where: { id: toWalletId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      // 3. Create EXPENSE transaction from source wallet
      const expenseTransaction = await tx.transaction.create({
        data: {
          amount,
          type: 'EXPENSE',
          description: description || `Transfer ke ${toWallet.name}`,
          date: typeof date === 'string' ? new Date(date) : date,
          familyId: session.familyId!,
          userId: session.userId,
          categoryId: transferCategory.id,
          fromWalletId: fromWalletId,
        },
      });

      // 4. Create INCOME transaction to destination wallet
      const incomeTransaction = await tx.transaction.create({
        data: {
          amount,
          type: 'INCOME',
          description: description || `Transfer dari ${fromWallet.name}`,
          date: typeof date === 'string' ? new Date(date) : date,
          familyId: session.familyId!,
          userId: session.userId,
          categoryId: transferCategory.id,
          fromWalletId: toWalletId,
        },
      });

      // 5. Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: 'WALLET_TRANSFER',
          entityType: 'Wallet',
          entityId: fromWalletId,
          changes: {
            fromWalletId,
            fromWalletName: fromWallet.name,
            toWalletId,
            toWalletName: toWallet.name,
            amount,
            previousFromBalance: fromWallet.balance,
            newFromBalance: updatedFromWallet.balance,
            previousToBalance: toWallet.balance,
            newToBalance: updatedToWallet.balance,
            expenseTransactionId: expenseTransaction.id,
            incomeTransactionId: incomeTransaction.id,
          },
        },
      });

      return {
        fromWallet: updatedFromWallet,
        toWallet: updatedToWallet,
        transactions: [expenseTransaction, incomeTransaction],
      };
    });

    return NextResponse.json(
      {
        transfer: {
          fromWallet: {
            id: result.fromWallet.id,
            name: fromWallet.name,
            previousBalance: fromWallet.balance,
            newBalance: result.fromWallet.balance,
          },
          toWallet: {
            id: result.toWallet.id,
            name: toWallet.name,
            previousBalance: toWallet.balance,
            newBalance: result.toWallet.balance,
          },
          amount,
          description: description || `Transfer dari ${fromWallet.name} ke ${toWallet.name}`,
          date,
          transactions: result.transactions,
        },
        message: 'Transfer berhasil',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Wallet transfer error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: error.errors },
        { status: 400 }
      );
    }

    // Handle Prisma errors
    const prismaError = PrismaErrorHandler.handle(error);
    if (prismaError.code !== 'UNKNOWN') {
      return NextResponse.json(
        {
          error: prismaError.message,
          code: prismaError.code,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat melakukan transfer' },
      { status: 500 }
    );
  }
}
