export {};

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      payment: (params: { customerKey: string }) => {
        requestPayment: (params: {
          method: 'CARD' | 'VIRTUAL_ACCOUNT';
          amount: { currency: 'KRW'; value: number };
          orderId: string;
          orderName: string;
          successUrl: string;
          failUrl: string;
          customerName?: string;
          customerEmail?: string;
        }) => Promise<void>;
        requestBillingAuth: (params: {
          method: 'CARD';
          successUrl: string;
          failUrl: string;
          customerName?: string;
          customerEmail?: string;
        }) => Promise<void>;
      };
    };
  }
}
