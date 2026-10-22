import { apiFetch } from '../api';
import React, { useState } from 'react';
import { useCountry, usdApprox, inr } from '../hooks/useCountry';
import {
  CheckCircle,
  Zap,
  Sparkles,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  X,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  notify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, notify }) => {
  const { user, refreshCredits } = useAuth();
  const { isIndia } = useCountry();
  const [processingProduct, setProcessingProduct] = useState<string | null>(null);

  if (!isOpen) return null;

  const plans = [
    {
      id: 'free',
      name: 'FREE',
      priceINR: 0,
      price: '₹0',
      period: 'forever',
      credits: '50 credits',
      features: ['50 starter credits', 'Basic generation', 'Personal projects', 'Community access'],
      current: user?.plan === 'free',
      buttonText: 'Current Plan',
      isPopular: false
    },
    {
      id: 'sub_creator',
      name: 'CREATOR',
      priceINR: 299,
      price: '₹299',
      period: '/month',
      credits: '400 credits / mo',
      features: [
        '400 monthly credits',
        'Higher generation limits',
        'Projects & asset folders',
        'Priority GPU queue',
        'Commercial creation rights'
      ],
      current: user?.plan === 'creator',
      buttonText: user?.plan === 'creator' ? 'Active Plan' : 'Subscribe Creator',
      isPopular: true
    },
    {
      id: 'sub_pro',
      name: 'PRO',
      priceINR: 799,
      price: '₹799',
      period: '/month',
      credits: '1,000 credits / mo',
      features: [
        '1,000 monthly credits',
        'Highest concurrency limits',
        'Priority 4K rendering',
        'Advanced features & models',
        'Commercial creation rights'
      ],
      current: user?.plan === 'pro',
      buttonText: user?.plan === 'pro' ? 'Active Plan' : 'Subscribe Pro',
      isPopular: false
    }
  ];

  const creditPacks = [
    { id: 'pack_100', name: '100 Credits', priceINR: 99, price: '₹99', credits: 100, costPerCr: '₹0.99/cr' },
    { id: 'pack_400', name: '400 Credits', priceINR: 299, price: '₹299', credits: 400, costPerCr: '₹0.74/cr', bestValue: true },
    { id: 'pack_1500', name: '1,500 Credits', priceINR: 999, price: '₹999', credits: 1500, costPerCr: '₹0.66/cr' }
  ];

  const handlePurchase = async (productId: string, type: 'subscription' | 'pack') => {
    if (!user) {
      notify('error', 'Please sign in to make a purchase.');
      return;
    }

    setProcessingProduct(productId);

    try {
      // 1. Create order on server
      const res = await apiFetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, type })
      });

      const orderData = await res.json();

      if (!res.ok) {
        // If razorpay is not configured, display exactly: "Payments are not configured yet."
        if (orderData.configured === false || res.status === 503) {
          notify(
            'info',
            'Payments are not configured yet. Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the environment to process live payments.',
            'Payment Gateway Notice'
          );
          return;
        }
        throw new Error(orderData.error || 'Failed to initiate checkout.');
      }

      // 2. Open Razorpay Checkout modal
      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'KANTHI AI',
        description: orderData.description,
        order_id: orderData.orderId,
        theme: { color: '#7928CA' },
        prefill: {
          name: user.displayName,
          email: user.email
        },
        handler: async (response: any) => {
          // 3. Verify signature cryptographically on server
          try {
            const verifyRes = await apiFetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                productId,
                type
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || 'Payment verification failed.');
            }

            // Success! Refresh user credits
            await refreshCredits();

            try {
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            } catch (e) {}

            notify(
              'success',
              `Payment successful! Added ${verifyData.creditsAdded} credits to your account.`,
              'Credits Added'
            );
            onClose();
          } catch (err: any) {
            notify('error', err.message || 'Payment verification failed.');
          }
        },
        modal: {
          ondismiss: () => {
            setProcessingProduct(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        notify('error', resp.error.description || 'Payment failed.');
      });
      rzp.open();
    } catch (err: any) {
      notify('error', err.message || 'Payment service error.');
    } finally {
      setProcessingProduct(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="max-w-5xl w-full bg-[#0D0F16] border border-[#23293D] rounded-3xl p-5 sm:p-8 shadow-2xl relative my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-3">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Power Your Imagination</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            Plans & Creative Credits
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            {isIndia
              ? 'Pay securely in INR with Razorpay UPI, Cards & Netbanking.'
              : 'Pay securely with your international card via Razorpay. Charged in INR — your bank converts it to your currency.'}
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`rounded-2xl p-6 flex flex-col justify-between transition-all relative ${
                plan.isPopular
                  ? 'bg-gradient-to-b from-[#1C172E] to-[#10121B] border-2 border-purple-500 shadow-xl shadow-purple-900/30'
                  : 'bg-[#121520] border border-[#1E2333]'
              }`}
            >
              {plan.isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-black uppercase tracking-wider shadow">
                  Most Popular
                </span>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    {plan.name}
                  </span>
                  <span className="text-xs font-bold text-amber-400">{plan.credits}</span>
                </div>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-black text-white font-display">{plan.price}</span>
                  <span className="text-xs text-gray-400">{plan.period}</span>
                </div>
                {!isIndia && plan.priceINR > 0 && (
                  <div className="text-xs text-gray-400 mb-5">{usdApprox(plan.priceINR)} USD approx.</div>
                )}
                {isIndia && <div className="mb-5" />}

                <ul className="space-y-2.5 text-xs text-gray-300 mb-6">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() =>
                  plan.id !== 'free' && handlePurchase(plan.id, 'subscription')
                }
                disabled={plan.current || processingProduct === plan.id}
                className={`w-full py-3 rounded-xl text-xs font-bold transition-all shadow-md ${
                  plan.current
                    ? 'bg-white/10 text-gray-400 cursor-default'
                    : plan.isPopular
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-600/30'
                    : 'bg-[#1C2133] hover:bg-[#252C44] text-white'
                }`}
              >
                {processingProduct === plan.id ? 'Connecting Gateway...' : plan.buttonText}
              </button>
            </div>
          ))}
        </div>

        {/* Credit Top-Up Packs */}
        <div className="p-6 rounded-2xl bg-[#121520] border border-[#1E2333] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Instant Credit Top-Up Packs</span>
              </h3>
              <p className="text-xs text-gray-400">
                Never run out of inspiration. Add credits anytime without changing your monthly tier.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {creditPacks.map(pack => (
              <div
                key={pack.id}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                  pack.bestValue
                    ? 'bg-purple-950/20 border-purple-500/50'
                    : 'bg-[#0B0D14] border-[#1C202E]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">{pack.name}</span>
                    {pack.bestValue && (
                      <span className="text-[9px] font-black px-1.5 py-0.2 bg-purple-500/30 text-purple-200 rounded">
                        Best Value
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400">{pack.costPerCr}</div>
                  {!isIndia && (
                    <div className="text-[11px] text-gray-500">{usdApprox(pack.priceINR)} approx.</div>
                  )}
                </div>

                <button
                  onClick={() => handlePurchase(pack.id, 'pack')}
                  disabled={processingProduct === pack.id}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow"
                >
                  {processingProduct === pack.id ? 'Processing...' : pack.price}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Legal & Expiration Notice */}
        <div className="mt-6 flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-gray-400">
          <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Unused subscription credits expire according to the applicable monthly subscription
            renewal terms. Top-up credit packs never expire. All payments are securely processed
            via Razorpay{isIndia ? '.' : ', including international credit and debit cards.'}
          </p>
        </div>
      </div>
    </div>
  );
};
