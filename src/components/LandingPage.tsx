import React, { useState } from 'react';
import { useCountry, usdApprox } from '../hooks/useCountry';
import {
  Sparkles,
  ArrowRight,
  Compass,
  Wand2,
  Palette,
  Film,
  Zap,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  Layers,
  Star,
  Shield,
  Eye,
  Rocket
} from 'lucide-react';

interface LandingPageProps {
  onStartCreating: () => void;
  onExplore: () => void;
  onOpenPricing: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartCreating,
  onExplore,
  onOpenPricing
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { isIndia } = useCountry();

  const faqs = [
    {
      q: 'What is KANTHI AI?',
      a: 'KANTHI AI is a cutting-edge creative AI platform engineered for artists, content creators, and storytellers to generate studio-grade images, anime, character sheets, and visual worlds using state-of-the-art Google Gemini and Imagen models.'
    },
    {
      q: 'How does the credit system work?',
      a: 'Every generation deducts credits server-side based strictly on output resolution: 1K resolution costs 5 credits, 2K costs 10 credits, and 4K costs 15 credits. New users receive 50 free credits upon joining! If a generation ever fails, your reserved credits are automatically restored.'
    },
    {
      q: 'Which AI models power KANTHI AI?',
      a: 'We utilize Google Gemini 3.1 Flash Image, Gemini 3.1 Flash-Lite Image, Gemini 2.5 Flash Image, and Imagen 3.0 Core. For prompt enhancement, our system utilizes Gemini 2.5 Flash.'
    },
    {
      q: 'Can I use generated images commercially?',
      a: 'Yes! Creators on the Creator and Pro plans enjoy full commercial rights to monetize their AI creations on YouTube, Instagram, prints, merchandise, and client projects.'
    },
    {
      q: isIndia ? 'Which payment methods are supported in India?' : 'Which payment methods are supported?',
      a: isIndia
        ? 'We integrate with Razorpay to support UPI (Google Pay, PhonePe, Paytm), Indian Debit/Credit cards, Netbanking, and Wallets in Indian Rupees (₹).'
        : 'We use Razorpay to accept international credit and debit cards from anywhere in the world. Payments are charged in Indian Rupees (₹) and your bank converts the amount to your local currency.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#08090C] text-gray-100 flex flex-col selection:bg-purple-600 selection:text-white">
      {/* Top Banner & Hero */}
      <section className="relative pt-24 pb-20 px-4 md:px-8 overflow-hidden">
        {/* Ambient Gradient Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] bg-gradient-to-b from-purple-900/25 via-pink-900/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 right-10 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#151926] border border-purple-500/30 text-purple-300 text-xs font-semibold mb-8 shadow-inner animate-pulse-glow">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Next-Gen Gemini 3.1 & Imagen 3 Creative Suite</span>
          </div>

          {/* Master Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold font-display tracking-tight text-white mb-6 leading-[1.1]">
            Turn imagination into{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-300">
              creation.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            Create stunning images, characters and visual worlds with AI. Built for creators,
            YouTubers, anime artists, and digital visionaries.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={onStartCreating}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-base shadow-xl shadow-purple-600/30 flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 group"
            >
              <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span>Start creating</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              onClick={onExplore}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#141824] hover:bg-[#1C2233] border border-[#262C3E] text-gray-200 font-semibold text-base flex items-center justify-center gap-2.5 transition-all hover:border-purple-500/50"
            >
              <Compass className="w-5 h-5 text-purple-400" />
              <span>Explore creations</span>
            </button>
          </div>

          {/* Hero Feature Showcase Grid Preview */}
          <div className="relative rounded-3xl p-2 bg-gradient-to-b from-[#232838] to-[#12151F] shadow-2xl border border-white/10 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl overflow-hidden bg-[#0A0C12] p-3">
              <div className="relative aspect-[4/5] rounded-xl overflow-hidden group">
                <img
                  src="https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80"
                  alt="Cyberpunk Ronin"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end text-left">
                  <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">
                    Cyberpunk 2K
                  </span>
                  <div className="text-sm font-semibold text-white">Neo-Tokyo Ronin Masterpiece</div>
                </div>
              </div>

              <div className="relative aspect-[4/5] rounded-xl overflow-hidden group">
                <img
                  src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80"
                  alt="Celestial Anime Queen"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end text-left">
                  <span className="text-[11px] font-bold text-pink-300 uppercase tracking-wider">
                    Anime 4K
                  </span>
                  <div className="text-sm font-semibold text-white">Celestial Guardian of Dawn</div>
                </div>
              </div>

              <div className="relative aspect-[4/5] rounded-xl overflow-hidden group">
                <img
                  src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80"
                  alt="Solarpunk Citadel"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end text-left">
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                    Concept Art 1K
                  </span>
                  <div className="text-sm font-semibold text-white">Bioluminescent Sanctuary</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Creative Pillars Section */}
      <section className="py-20 px-4 md:px-8 border-t border-[#181C26] bg-[#0A0C11]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs uppercase font-extrabold tracking-widest text-purple-400 mb-3">
              Crafted for Visionaries
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-display">
              Everything you need to turn thoughts into visual reality
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#10131C] border border-[#1F2433] hover:border-purple-500/40 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-4">
                <Palette className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">AI Image Generation</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                Render at 1K, 2K, or 4K with multiple aspect ratios (1:1, 16:9, 9:16, 4:3). Negative
                prompts, custom styles, and lightning-fast previews.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#10131C] border border-[#1F2433] hover:border-pink-500/40 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Gemini Prompt Enhancer</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                Transform single-phrase ideas into deeply descriptive, masterfully lit cinematic
                prompts with our Gemini text model reasoning pipeline.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#10131C] border border-[#1F2433] hover:border-cyan-500/40 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Organized Projects & History</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                Create dedicated folders for your anime series, YouTube thumbnails, Instagram
                campaigns, and game concept art without losing track.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community & Explore Highlight */}
      <section className="py-20 px-4 md:px-8 border-t border-[#181C26] bg-[#08090C]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <span className="text-xs font-extrabold uppercase tracking-widest text-pink-400 mb-3 block">
              Creator Community
            </span>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-display mb-4">
              Publish, inspire, and collaborate with creators globally
            </h3>
            <p className="text-gray-400 leading-relaxed mb-6">
              Keep your creations private, or publish them to the KANTHI AI Community Explore
              feed. Like other creators' work, inspect styling techniques, and copy prompt
              breakdowns with one tap.
            </p>
            <button
              onClick={onExplore}
              className="px-6 py-3 rounded-xl bg-[#161B28] hover:bg-[#20273B] border border-purple-500/30 text-white font-semibold text-sm flex items-center gap-2 transition-all"
            >
              <Compass className="w-4 h-4 text-purple-400" />
              <span>Browse Community Gallery</span>
            </button>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-3">
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg aspect-square">
              <img
                src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=500&q=80"
                alt="Anime Art"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg aspect-square mt-6">
              <img
                src="https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=500&q=80"
                alt="Cyberpunk"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="py-20 px-4 md:px-8 border-t border-[#181C26] bg-[#0A0C11]">
        <div className="max-w-5xl mx-auto text-center">
          <span className="text-xs font-extrabold uppercase tracking-widest text-purple-400 mb-3 block">
            Transparent Pricing
          </span>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-display mb-4">
            Simple plans for every stage of your creative journey
          </h3>
          <p className="text-gray-400 max-w-xl mx-auto mb-12">
            Start for free with 50 credits, then upgrade as your production scales.{' '}
            {isIndia
              ? 'Pay in INR with Razorpay UPI and cards.'
              : 'Pay with your international card via Razorpay — charged in INR, converted by your bank.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Free */}
            <div className="p-6 rounded-2xl bg-[#10131C] border border-[#1F2433] flex flex-col justify-between">
              <div>
                <div className="text-xs uppercase font-bold text-gray-400 mb-2">Starter</div>
                <h4 className="text-2xl font-black text-white mb-1">FREE</h4>
                <div className="text-3xl font-extrabold text-white font-display mb-6">₹0</div>
                <ul className="space-y-3 text-xs text-gray-300 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>50 starter credits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Basic generation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Personal projects</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={onStartCreating}
                className="w-full py-3 rounded-xl bg-[#1A1F2C] hover:bg-[#252C3E] text-white text-xs font-bold transition-all text-center"
              >
                Get Started
              </button>
            </div>

            {/* Creator */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-[#181528] to-[#10131C] border-2 border-purple-500/60 shadow-xl shadow-purple-900/20 flex flex-col justify-between relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-black uppercase tracking-wider">
                Most Popular
              </span>
              <div>
                <div className="text-xs uppercase font-bold text-purple-400 mb-2">Creator</div>
                <h4 className="text-2xl font-black text-white mb-1">CREATOR</h4>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-extrabold text-white font-display">₹299</span>
                  <span className="text-xs text-gray-400">/month</span>
                </div>
                {!isIndia && (
                  <div className="text-xs text-gray-400 mb-5">{usdApprox(299)} USD approx.</div>
                )}
                <ul className="space-y-3 text-xs text-gray-300 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="font-semibold text-white">400 monthly credits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Higher limits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Projects & collections</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Priority generation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Commercial creation</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={onOpenPricing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold transition-all shadow-lg text-center"
              >
                Choose Creator
              </button>
            </div>

            {/* Pro */}
            <div className="p-6 rounded-2xl bg-[#10131C] border border-[#1F2433] flex flex-col justify-between">
              <div>
                <div className="text-xs uppercase font-bold text-cyan-400 mb-2">Studio & Pro</div>
                <h4 className="text-2xl font-black text-white mb-1">PRO</h4>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-extrabold text-white font-display">₹799</span>
                  <span className="text-xs text-gray-400">/month</span>
                </div>
                {!isIndia && (
                  <div className="text-xs text-gray-400 mb-5">{usdApprox(799)} USD approx.</div>
                )}
                <ul className="space-y-3 text-xs text-gray-300 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="font-semibold text-white">1,000 monthly credits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Highest concurrency limits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Priority 4K generation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Advanced features</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Commercial creation</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={onOpenPricing}
                className="w-full py-3 rounded-xl bg-[#1A1F2C] hover:bg-[#252C3E] text-white text-xs font-bold transition-all text-center"
              >
                Choose Pro
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 md:px-8 border-t border-[#181C26] bg-[#08090C]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-extrabold text-white font-display mb-3">
              Frequently Asked Questions
            </h3>
            <p className="text-gray-400 text-sm">
              Everything you need to know about KANTHI AI creative features and billing.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#10131C] border border-[#1F2433] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4"
                  >
                    <span className="font-semibold text-white text-sm sm:text-base">{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        isOpen ? 'rotate-180 text-purple-400' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-gray-300 leading-relaxed border-t border-white/5 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#181C26] bg-[#07080B] py-12 px-4 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-400 p-[1px]">
              <div className="w-full h-full bg-[#08090C] rounded-[7px] flex items-center justify-center font-display font-extrabold text-white text-sm">
                K
              </div>
            </div>
            <div>
              <div className="font-display font-black text-white text-base">KANTHI AI</div>
              <div className="text-[11px] text-gray-500">Turn imagination into creation.</div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-gray-400">
            <button onClick={onStartCreating} className="hover:text-white transition-colors">
              Studio
            </button>
            <button onClick={onExplore} className="hover:text-white transition-colors">
              Explore
            </button>
            <button onClick={onOpenPricing} className="hover:text-white transition-colors">
              Pricing
            </button>
            <span>© {new Date().getFullYear()} KANTHI AI. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
