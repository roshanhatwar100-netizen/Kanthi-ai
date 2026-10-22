import crypto from 'crypto';
import Razorpay from 'razorpay';
import { SERVER_CONFIG } from './config.js';

let razorpayInstance: Razorpay | null = null;

if (SERVER_CONFIG.hasRazorpayConfigured) {
  try {
    razorpayInstance = new Razorpay({
      key_id: SERVER_CONFIG.razorpayKeyId,
      key_secret: SERVER_CONFIG.razorpayKeySecret,
    });
  } catch (err) {
    console.error('Failed to initialize Razorpay instance:', err);
  }
}

export function isRazorpayConfigured(): boolean {
  return SERVER_CONFIG.hasRazorpayConfigured && razorpayInstance !== null;
}

export interface CreateOrderParams {
  productId: string; // 'pack_100' | 'pack_400' | 'pack_1500' | 'sub_creator' | 'sub_pro'
  type: 'pack' | 'subscription';
  uid: string;
}

export async function createRazorpayOrder(params: CreateOrderParams) {
  if (!isRazorpayConfigured() || !razorpayInstance) {
    throw new Error('Payments are not configured yet.');
  }

  const { productId, type, uid } = params;
  let amountINR = 0;
  let credits = 0;
  let planId: string | null = null;
  let description = '';

  if (type === 'pack') {
    const pack = SERVER_CONFIG.creditPacks[productId as keyof typeof SERVER_CONFIG.creditPacks];
    if (!pack) {
      throw new Error(`Invalid credit pack ID: ${productId}`);
    }
    amountINR = pack.priceINR;
    credits = pack.credits;
    description = `KANTHI AI ${pack.name} Top-Up`;
  } else if (type === 'subscription') {
    if (productId === 'sub_creator') {
      amountINR = SERVER_CONFIG.plans.creator.priceINR;
      credits = SERVER_CONFIG.plans.creator.monthlyCredits;
      planId = 'creator';
      description = 'KANTHI AI Creator Plan Monthly';
    } else if (productId === 'sub_pro') {
      amountINR = SERVER_CONFIG.plans.pro.priceINR;
      credits = SERVER_CONFIG.plans.pro.monthlyCredits;
      planId = 'pro';
      description = 'KANTHI AI Pro Plan Monthly';
    } else {
      throw new Error(`Invalid subscription product ID: ${productId}`);
    }
  }

  // Razorpay amounts are in smallest currency sub-units (paise: 1 INR = 100 paise)
  const amountPaise = Math.round(amountINR * 100);
  const receipt = `k_${Date.now()}_${uid.slice(0, 6)}`;

  const orderOptions = {
    amount: amountPaise,
    currency: 'INR',
    receipt,
    notes: {
      uid,
      productId,
      type,
      credits: credits.toString(),
      planId: planId || '',
    }
  };

  const order = await razorpayInstance.orders.create(orderOptions);

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: SERVER_CONFIG.razorpayKeyId,
    description,
    productId,
    credits,
    planId
  };
}

export async function getRazorpayOrder(orderId: string) {
  if (!isRazorpayConfigured() || !razorpayInstance) {
    throw new Error('Payments are not configured yet.');
  }
  return razorpayInstance.orders.fetch(orderId);
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!SERVER_CONFIG.razorpayKeySecret) {
    return false;
  }
  const expectedSignature = crypto
    .createHmac('sha256', SERVER_CONFIG.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf-8'),
    Buffer.from(signature, 'utf-8')
  );
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  if (!SERVER_CONFIG.razorpayWebhookSecret) {
    return false;
  }
  const expectedSignature = crypto
    .createHmac('sha256', SERVER_CONFIG.razorpayWebhookSecret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf-8'),
    Buffer.from(signature, 'utf-8')
  );
}
