import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/server/auth/require-user';
import { prisma } from '@/server/prisma';

const Schema = z.object({
  amountKrw: z.coerce.number().int().min(1000).max(10_000_000),
  orderName: z.string().min(1).max(100),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('ADVERTISER');
    const json = await req.json();
    const parsed = Schema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { amountKrw, orderName, customerName, customerEmail } = parsed.data;

    // Generate unique orderId for Toss Payments
    const orderId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create payment record in database
    const payment = await prisma.payment.create({
      data: {
        id: orderId,
        advertiserId: user.id, // Assuming user.id is advertiserId for ADVERTISER role
        amountKrw,
        status: 'CREATED',
        provider: 'TOSS',
        providerRef: orderId, // Will be updated with actual paymentKey after confirmation
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: { id: true, amountKrw: true, status: true }
    });

    // Return payment info for frontend
    return NextResponse.json({
      success: true,
      payment: {
        orderId: payment.id,
        amount: payment.amountKrw,
        orderName,
        customerName,
        customerEmail,
      }
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
