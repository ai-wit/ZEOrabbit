import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { verifyTossWebhookSignature } from '@/server/toss-payments';

function shouldCreditTopupBudget(params: { paymentId: string }): boolean {
  return params.paymentId.startsWith('pay_');
}

export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('TossPayments-Webhook-Signature');

    // Verify webhook signature
    if (!verifyTossWebhookSignature({
      rawBody,
      signatureHeader: signature
    })) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const webhookData = JSON.parse(rawBody);

    // Extract payment information
    const {
      paymentKey,
      orderId,
      status,
      totalAmount,
      approvedAt,
      method
    } = webhookData;

    console.log('Toss webhook received:', {
      paymentKey,
      orderId,
      status,
      totalAmount,
      approvedAt,
      method
    });

    // Find payment by orderId
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
      console.error('Payment not found for orderId:', orderId);
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    if (payment.provider !== 'TOSS') {
      console.error('Payment provider mismatch:', payment.provider);
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Map Toss status to our status
    let newStatus: 'CREATED' | 'PAID' | 'FAILED' | 'CANCELED' | 'REFUNDED';
    switch (status) {
      case 'DONE':
        newStatus = 'PAID';
        break;
      case 'CANCELED':
        newStatus = 'CANCELED';
        break;
      case 'PARTIAL_CANCELED':
      case 'EXPIRED':
        newStatus = 'FAILED';
        break;
      default:
        console.log('Unknown status:', status);
        return NextResponse.json({ ok: true }); // Acknowledge but don't process
    }

    // Skip if status is already final
    if (payment.status === 'PAID' || payment.status === 'FAILED' ||
        payment.status === 'CANCELED' || payment.status === 'REFUNDED') {
      console.log('Payment already in final status:', payment.status);
      return NextResponse.json({ ok: true });
    }

    // Update payment and create ledger entry if needed
    await prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          providerRef: paymentKey,
          updatedAt: new Date(),
        }
      });

      // Create budget ledger entry for successful payments
      if (
        newStatus === 'PAID' &&
        payment.status !== 'PAID' &&
        shouldCreditTopupBudget({ paymentId: payment.id })
      ) {
        await tx.budgetLedger.create({
          data: {
            advertiserId: payment.advertiserId,
            amountKrw: payment.amountKrw,
            reason: 'TOPUP',
            refId: payment.id,
            createdAt: new Date(),
          }
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'WEBHOOK_PAYMENT_UPDATE',
          targetType: 'Payment',
          targetId: payment.id,
          payloadJson: {
            oldStatus: payment.status,
            newStatus,
            webhookStatus: status,
            paymentKey,
            amount: totalAmount,
            approvedAt,
            method
          }
        }
      });
    });

    console.log('Payment updated successfully:', {
      orderId,
      oldStatus: payment.status,
      newStatus
    });

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
