import Link from "next/link";
import { ArrowRight, TrendingUp, ShieldCheck, Target } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-[#990000] selection:text-white">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-[100] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-10">
               <Link href="/" className="flex items-center gap-4 group">
                  <div className="w-10 h-10 bg-[#990000] rounded-lg flex items-center justify-center text-white font-serif italic text-xl font-black shadow-lg shadow-red-200 group-hover:scale-105 transition-transform">
                    ET
                  </div>
                  <h1 className="text-2xl font-black tracking-tighter text-neutral-900 font-serif lowercase italic">explorer</h1>
               </Link>
               
               <div className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-neutral-400">
                 <Link href="/" className="text-[#990000]">Home</Link>
                 <Link href="/dashboard" className="hover:text-[#990000] transition-colors">Dashboard</Link>
               </div>
            </div>
            <Link 
              href="/onboarding" 
              className="text-xs font-bold uppercase tracking-widest text-[#990000] hover:text-neutral-900 transition-colors"
            >
              Start Free Orbit
            </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <div className="relative isolate px-6 pt-14 lg:px-8">
          <div className="mx-auto max-w-4xl py-24 sm:py-32 lg:py-40">
            <div className="hidden sm:mb-10 sm:flex sm:justify-center">
              <div className="relative rounded-full px-4 py-2 text-[10px] font-black leading-6 text-[#990000] ring-1 ring-[#990000]/20 hover:ring-[#990000]/40 transition-all uppercase tracking-widest bg-white shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Next-Gen Financial Intelligence Is Live
              </div>
            </div>
            
            <div className="text-center">
              <h1 className="text-7xl font-black tracking-tighter text-neutral-900 sm:text-[100px] leading-[1.1] font-serif">
                Design Your <br/>
                <span className="italic text-[#990000]">Financial Orbit</span>
              </h1>
              <p className="mt-10 text-lg font-medium leading-relaxed text-neutral-500 max-w-2xl mx-auto tracking-wide">
                Build your Financial Independence trajectory with institutional-grade data. 
                Visualize life goals, calculate robust Safe Withdrawal Rates, and let Open-Source AI optimize your compounding trajectory out to age 80.
              </p>
              <div className="mt-14 flex items-center justify-center gap-x-6">
                <Link
                  href="/onboarding"
                  className="rounded-full bg-[#990000] px-10 py-5 text-xs font-black text-white shadow-xl shadow-red-200 hover:bg-neutral-900 hover:shadow-2xl hover:-translate-y-1 transition-all uppercase tracking-widest flex items-center gap-3 group"
                >
                  Generate Path <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="max-w-7xl mx-auto px-6 pb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-10 rounded-[3rem] border border-neutral-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-2 cursor-default">
              <div className="w-14 h-14 bg-neutral-50 rounded-2xl flex items-center justify-center mb-8">
                <TrendingUp className="w-6 h-6 text-[#990000]" />
              </div>
              <h3 className="text-2xl font-black tracking-tighter mb-4 font-serif">Dynamic Glide Paths</h3>
              <p className="text-neutral-500 text-sm leading-relaxed font-medium">Automatic de-risking projections. Watch your portfolio dynamically shift from high-growth equities securely into protective debt yields as you approach your defined FIRE target.</p>
            </div>
            
            <div className="bg-white p-10 rounded-[3rem] border border-neutral-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-2 cursor-default">
              <div className="w-14 h-14 bg-neutral-50 rounded-2xl flex items-center justify-center mb-8">
                <Target className="w-6 h-6 text-[#990000]" />
              </div>
              <h3 className="text-2xl font-black tracking-tighter mb-4 font-serif">Life Goal Subtractions</h3>
              <p className="text-neutral-500 text-sm leading-relaxed font-medium">Buying a home? Funding a degree? Plot major cash outflows onto your compounding timeline to see exactly how these events alter your final baseline withdrawal stamina.</p>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-neutral-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-2 cursor-default">
              <div className="w-14 h-14 bg-neutral-50 rounded-2xl flex items-center justify-center mb-8">
                <ShieldCheck className="w-6 h-6 text-[#990000]" />
              </div>
              <h3 className="text-2xl font-black tracking-tighter mb-4 font-serif">AI Financial Telemetry</h3>
              <p className="text-neutral-500 text-sm leading-relaxed font-medium">Engage securely with the blazingly fast Llama-3.1 API. Chat directly with an LLM that reads your specific datasets, simulating Safe Withdrawal tolerances to verify your ultimate trajectory.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
