import Link from "next/link";
import { ArrowRight, TrendingUp, ShieldCheck, Target } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black font-black font-sans selection:bg-[#990000] selection:text-white">
      {/* Header */}
      <header className="bg-white border-b-2 border-black sticky top-0 z-[100] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-10">
               <Link href="/" className="flex items-center gap-4 group">
                  <div className="w-10 h-10 bg-[#990000] rounded-lg flex items-center justify-center text-white font-serif italic text-xl font-black shadow-lg shadow-red-200 group-hover:scale-105 transition-transform">
                    ET
                  </div>
                  <h1 className="text-2xl font-black tracking-tighter text-black font-black font-serif lowercase italic">explorer</h1>
               </Link>
               
               <div className="hidden md:flex items-center gap-6 text-xs font-black uppercase tracking-widest text-black font-black">
                 <Link href="/" className="text-[#990000]">Home</Link>
                 <Link href="/dashboard" className="hover:text-[#990000] transition-colors">Dashboard</Link>
               </div>
            </div>
            <Link 
              href="/onboarding" 
              className="text-xs font-bold uppercase tracking-widest text-[#990000] hover:text-black font-black transition-colors"
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
              <div className="relative rounded-full px-6 py-3 text-[10px] font-black leading-6 text-[#990000] border-2 border-[#990000] hover:bg-[#990000] hover:text-white transition-all uppercase tracking-[0.2em] bg-white shadow-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse outline outline-4 outline-emerald-100" /> Next-Gen Financial Intelligence Is Live
              </div>
            </div>
            
            <div className="text-center">
              <h1 className="text-7xl font-black tracking-tighter text-black font-black sm:text-[100px] leading-[1.1] font-serif">
                Design Your <br/>
                <span className="italic text-[#990000]">Financial Orbit</span>
              </h1>
              <p className="mt-10 text-xl font-black leading-relaxed text-black font-black max-w-2xl mx-auto tracking-tight">
                Build your Financial Independence trajectory with institutional-grade data. 
                Visualize life goals, calculate robust Safe Withdrawal Rates, and let Open-Source AI optimize your compounding trajectory out to age 80.
              </p>
              <div className="mt-14 flex items-center justify-center gap-x-6">
                <Link
                  href="/onboarding"
                  className="rounded-full bg-[#990000] px-10 py-5 text-xs font-black text-white shadow-2xl shadow-red-200 hover:bg-neutral-950 hover:shadow-2xl hover:-translate-y-1 transition-all uppercase tracking-[0.3em] flex items-center gap-3 group border-4 border-transparent hover:border-black"
                >
                  Generate Path <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="max-w-7xl mx-auto px-6 pb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="bg-white p-12 rounded-[3.5rem] border-4 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all hover:translate-x-1 hover:translate-y-1 cursor-default group">
              <div className="w-16 h-16 bg-neutral-950 rounded-2xl flex items-center justify-center mb-10 shadow-lg">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-black tracking-tighter mb-6 font-serif">Dynamic Glide Paths</h3>
              <p className="text-black text-base leading-relaxed font-black">Automatic de-risking projections. Watch your portfolio dynamically shift from high-growth equities securely into protective debt yields as you approach your defined FIRE target.</p>
            </div>
            
            <div className="bg-white p-12 rounded-[3.5rem] border-4 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all hover:translate-x-1 hover:translate-y-1 cursor-default group">
              <div className="w-16 h-16 bg-neutral-950 rounded-2xl flex items-center justify-center mb-10 shadow-lg">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-black tracking-tighter mb-6 font-serif">Life Goal Subtractions</h3>
              <p className="text-black text-base leading-relaxed font-black">Buying a home? Funding a degree? Plot major cash outflows onto your compounding timeline to see exactly how these events alter your final baseline withdrawal stamina.</p>
            </div>

            <div className="bg-white p-12 rounded-[3.5rem] border-4 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all hover:translate-x-1 hover:translate-y-1 cursor-default group">
              <div className="w-16 h-16 bg-neutral-950 rounded-2xl flex items-center justify-center mb-10 shadow-lg">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-black tracking-tighter mb-6 font-serif">AI Financial Telemetry</h3>
              <p className="text-black text-base leading-relaxed font-black">Engage securely with the blazingly fast Llama-3.1 API. Chat directly with an LLM that reads your specific datasets, simulating Safe Withdrawal tolerances to verify your ultimate trajectory.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
