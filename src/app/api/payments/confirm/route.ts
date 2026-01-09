import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/server/auth/require-user';
import { prisma } from '@/server/prisma';
import { confirmTossPayment } from '@/server/toss-payments';
import { getAdvertiserProfileIdByUserId } from '@/server/advertiser/advertiser-profile';

const Schema = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.coerce.number().int().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('ADVERTISER');
    const advertiserId = await getAdvertiserProfileIdByUserId(user.id);
    const json = await req.json();
    const parsed = Schema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { paymentKey, orderId, amount } = parsed.data;

    // This endpoint is only for TOPUP payments.
    if (!orderId.startsWith('pay_')) {
      return NextResponse.json(
        { error: 'Invalid payment type' },
        { status: 400 }
      );
    }

    // Verify payment exists and belongs to user
    const payment = await prisma.payment.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        advertiserId: true,
        amountKrw: true,
        status: true,
        provider: true,
        providerRef: true
      }
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    if (payment.advertiserId !== advertiserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (payment.status !== 'CREATED') {
      return NextResponse.json(
        { error: 'Payment already processed' },
        { status: 409 }
      );
    }

    if (payment.amountKrw !== amount) {
      return NextResponse.json(
        { error: 'Amount mismatch' },
        { status: 400 }
      );
    }

    // Confirm payment with Toss Payments
    const tossResponse = await confirmTossPayment({
      paymentKey,
      orderId,
      amount,
    });

    if (tossResponse.status !== 'DONE') {
      return NextResponse.json(
        { error: 'Payment not completed', status: tossResponse.status },
        { status: 400 }
      );
    }

    // Update payment and create budget ledger in transaction
    await prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          providerRef: paymentKey,
          updatedAt: new Date(),
        }
      });

      // Create budget ledger entry
      await tx.budgetLedger.create({
        data: {
          advertiserId: payment.advertiserId,
          amountKrw: payment.amountKrw,
          reason: 'TOPUP',
          refId: payment.id,
          createdAt: new Date(),
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'PAYMENT_CONFIRMED',
          targetType: 'Payment',
          targetId: payment.id,
          payloadJson: {
            paymentKey,
            amount: payment.amountKrw,
            provider: 'TOSS'
          }
        }
      });
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amountKrw,
        status: 'PAID'
      }
    });

  } catch (error) {
    console.error('Payment confirmation error:', error);

    // If it's a Toss Payments API error, return specific error
    if (error instanceof Error && error.message.includes('TossPayments')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
