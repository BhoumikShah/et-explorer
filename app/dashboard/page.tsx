"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { getProfile } from "../../lib/api";
import { 
  Target, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  ArrowUpRight, 
  BarChart3, 
  Info,
  LogOut,
  ChevronRight,
  PieChart,
  SlidersHorizontal,
  Flame,
  LineChart as LineIcon,
  Download,
  MessageSquare,
  X,
  Send
} from "lucide-react";

// Recharts imports - Using Recharts for Dashboard stability
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ReferenceLine
} from 'recharts';

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orbit' | 'tactics'>('orbit');

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatTyping, setIsChatTyping] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        let userId = sessionData?.session?.user?.id;
        if (!userId) {
          router.push("/onboarding");
          return;
        }
        const { data, error: profileError } = await getProfile(userId);
        if (profileError || !data) {
          router.push("/onboarding");
        } else {
          setProfile(data);
          // Calculate local roadmap based on profile
          const calculatedState = calculateRoadmap(data);
          setRoadmap(calculatedState);
          setLoading(false);
        }
      } catch (err) {
        console.error("Dashboard init failed:", err);
      }
    };
    fetchData();
  }, [router]);

  const calculateRoadmap = (profile: any) => {
    const monthly = profile.monthly_expenses || 40000;
    const wr = profile.fire_preferences?.swr || 4.0;
    const fireTarget = (monthly * 12) / (wr / 100);
    const cushion = monthly * 12 * 2; // Assuming 2y cushion as default
    const totalTarget = fireTarget + cushion;
    const yearsToRetire = (profile.retirement_age || 60) - (profile.age || 30);
    
    // Simple projection
    let projection = [];
    let current = Number(profile.current_savings) || 0;
    let target = totalTarget;
    let sip = Number(profile.monthly_investment_budget) || 10000;
    let startAge = profile.age || 30;
    let retireAge = profile.retirement_age || 60;
    let fireDate = null;

    const milestones = profile.goals?.filter((g:any) => g.name !== 'FIRE') || [];

    let endAge = Math.max(80, retireAge + 5);
    let retireCorpus = 0;
    
    for (let m = 0; m <= (endAge - startAge) * 12; m++) {
      const currentYear = new Date().getFullYear() + Math.floor(m/12);
      const currentAge = startAge + Math.floor(m/12);
      
      // Glide Path Logic: Returns decrease as age increases (stops de-risking at retirement age)
      const equityBase = 0.8;
      const equityFinal = 0.3;
      const progressToRetire = Math.min(1, Math.max(0, (currentAge - startAge) / (retireAge - startAge)));
      const currentEquity = equityBase - (progressToRetire * (equityBase - equityFinal));
      const currentReturn = (currentEquity * 0.12) + ((1 - currentEquity) * 0.07);
      const monthlyRate = currentReturn / 12;

      // Handle Milestones (match all for the year)
      let milestoneEvents: any[] = [];
      if (m % 12 === 0) {
        milestones.forEach((g:any) => {
          if (g.target_year === currentYear && g.target_amount) {
            current -= g.target_amount;
            if (current < 0) current = 0;
            milestoneEvents.push({ name: g.name, amount: g.target_amount });
          }
        });
      }

      if (current >= target && !fireDate && currentAge <= retireAge) fireDate = m;
      if (currentAge === retireAge && m % 12 === 0 && retireCorpus === 0) retireCorpus = current;
      
      let currentWithdrawal = 0;
      if (currentAge >= retireAge) {
         // Standard FIRE model: Initial draw is WR% of the portfolio at retirement, then increased for inflation
         const yearsInRetirement = Math.max(0, Math.floor(m/12) - (retireAge - startAge));
         const annualWithdrawal = (retireCorpus * (wr / 100)) * Math.pow(1 + 0.06, yearsInRetirement);
         currentWithdrawal = annualWithdrawal / 12;
      }

      projection.push({
        month: m,
        year: currentYear,
        age: currentAge,
        wealth: Math.round(current),
        target: Math.round(target),
        equity: Math.round(currentEquity * 100),
        growthRate: (currentReturn * 100).toFixed(1),
        events: milestoneEvents
      });

      if (currentAge < retireAge) {
        current = current * (1 + monthlyRate) + Number(sip);
      } else {
        current = current * (1 + monthlyRate) - currentWithdrawal;
        if (current < 0) current = 0;
      }
    }

    const isGap = retireCorpus < totalTarget;

    // Real withdrawal survival simulation per SWR
    const swrAnalysis = [3.0, 3.5, 4.0, 4.5].map(testSwr => {
      let corpus = retireCorpus;
      const annualExpense = monthly * 12;
      const inflation = 0.06;
      const postRetireReturn = 0.07;
      let survivalYears = 0;
      const retireDuration = 105 - retireAge;
      
      for (let y = 0; y < retireDuration; y++) {
        // Required withdrawal increases with 6% inflation each year
        // We use the testSwr as the initial withdrawal rate against the required fireTarget
        // Specifically, the initial withdrawal is (testSWR / 100) * totalTarget, but the easiest
        // way to model it is just inflating the user's required annual expense.
        const withdraw = annualExpense * Math.pow(1 + inflation, y) * (testSwr / wr);
        
        corpus = corpus * (1 + postRetireReturn) - withdraw;
        if (corpus <= 0) break;
        survivalYears++;
      }

      const survivalRate = Math.min(100, Math.round((survivalYears / retireDuration) * 100));
      return { swr: testSwr, survivalYears, survivalRate, safe: survivalYears >= retireDuration };
    });

    return { totalTarget, fireTarget, cushion, projection, fireDate, yearsToRetire, milestones, isGap, swrAnalysis };
  };

  const formatCurrency = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
    return `₹${Math.floor(val).toLocaleString()}`;
  };

  // Initialize Chatbot when roadmap loads
  useEffect(() => {
    if (roadmap && chatMessages.length === 0) {
      setChatMessages([
        { role: 'assistant', content: `Hello! I'm your ET Wealth AI. I've analyzed your orbit and I see you are aiming for a ${formatCurrency(roadmap.totalTarget)} corpus by age ${roadmap.fireDate ? Math.floor(roadmap.fireDate/12) + profile.age : profile.retirement_age}. \n\nYou are currently investing ${formatCurrency(profile.monthly_investment_budget)} monthly. What questions can I answer about your FIRE strategy?` }
      ]);
    }
  }, [roadmap, profile]);

  const handleSendMessage = async (e: any) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMsg }], // Keeping it simple: no chat history state passed for now
          // Injecting your real metrics!
          contextData: {
            totalTarget: formatCurrency(roadmap.totalTarget),
            fireAge: roadmap.fireDate ? Math.floor(roadmap.fireDate/12) + profile.age : profile.retirement_age,
            swr: profile.fire_preferences?.swr || 4.0,
            monthlySip: formatCurrency(profile.monthly_investment_budget)
          }
        })
      });

      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Local LLM server not responding. Did you start Ollama?" }]);
    } finally {
      setIsChatTyping(false);
    }
  };

  if (loading) return (
     <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-t-2 border-[#990000] rounded-full animate-spin mb-8" />
        <p className="text-slate-900 font-black tracking-widest uppercase text-xs">Synchronizing Orbit...</p>
     </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-[1000] shadow-sm">
        <div className="max-w-[1400px] mx-auto px-8 py-6 flex items-center justify-between">
            <div className="flex items-center gap-10">
               <Link href="/" className="flex items-center gap-4 group">
                  <div className="w-10 h-10 bg-[#990000] rounded-lg flex items-center justify-center text-white font-serif italic text-xl font-black shadow-lg shadow-red-200 group-hover:scale-105 transition-transform">
                    ET
                  </div>
                  <h1 className="text-2xl font-black tracking-tighter text-neutral-900 font-serif lowercase italic">explorer</h1>
               </Link>
               
               <div className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-neutral-400 print:hidden">
                 <Link href="/" className="hover:text-[#990000] transition-colors">Home</Link>
                 <Link href="/dashboard" className="text-[#990000]">Dashboard</Link>
               </div>
               <div className="flex bg-neutral-100 p-1 rounded-xl print:hidden">
                  <button onClick={() => setActiveTab('orbit')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'orbit' ? "bg-white shadow-sm text-[#990000]" : "text-neutral-500 hover:text-neutral-900"}`}>Wealth Orbit</button>
                  <button onClick={() => setActiveTab('tactics')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'tactics' ? "bg-white shadow-sm text-[#990000]" : "text-neutral-500 hover:text-neutral-900"}`}>Tactical Explorer</button>
               </div>
            </div>
            <div className="flex items-center gap-4">
               <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-600 rounded-xl hover:bg-neutral-200 transition-colors text-xs font-bold uppercase tracking-widest hidden md:flex print:hidden">
                  <Download className="w-4 h-4" /> Export PDF
               </button>
               <button onClick={() => supabase.auth.signOut().then(() => router.push("/"))} className="p-3 text-neutral-400 hover:text-[#990000] transition-colors print:hidden">
                  <LogOut className="w-5 h-5" />
               </button>
            </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-8 py-10 grid grid-cols-12 gap-10">
        
        {/* Left Stats Rail */}
        <div className="col-span-12 lg:col-span-3 space-y-8">
           <div className="bg-[#990000] text-white rounded-[2.5rem] p-10 shadow-2xl shadow-red-100">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-6 flex items-center gap-2">
                <Flame className="w-4 h-4" /> FIRE TARGET
              </p>
              <div className="space-y-6">
                 <div>
                    <p className="text-4xl font-black tracking-tighter mb-1">{formatCurrency(roadmap.totalTarget)}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Complete Financial Liberty</p>
                 </div>
                 <div className="pt-6 border-t border-white/10 space-y-3">
                    <div className="flex justify-between items-center text-xs opacity-80">
                       <span>Yield Corpus</span>
                       <span className="font-black">{formatCurrency(roadmap.fireTarget)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs opacity-80">
                       <span>Cash Buffer</span>
                       <span className="font-black">{formatCurrency(roadmap.cushion)}</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-white border border-neutral-200 rounded-[2.5rem] p-10 shadow-sm flex flex-col gap-8">
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Readiness Score</p>
                 <div className="flex items-center gap-4">
                    <span className="text-4xl font-black text-[#990000]">8.4%</span>
                    <div className="flex-1 h-3 bg-neutral-100 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500" style={{ width: '8.4%' }} />
                    </div>
                 </div>
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Target Maturity</p>
                 <p className="text-lg font-bold">Age {profile.retirement_age} ({roadmap.yearsToRetire}y remaining)</p>
              </div>
           </div>
        </div>

        {/* Right Main Content */}
        <div className="col-span-12 lg:col-span-9 space-y-10">
           {activeTab === 'orbit' ? (
             <>
                {/* Growth Visualization */}
                <div className="bg-white border border-neutral-200 rounded-[3rem] p-12 shadow-sm">
                   <div className="flex items-end justify-between mb-12">
                      <div className="flex flex-col gap-2">
                         <h2 className="text-5xl font-black tracking-tighter text-neutral-900 font-serif italic uppercase">Wealth Orbit</h2>
                         <p className="text-neutral-500 text-sm font-medium">Lifecycle Report from Age {profile.age} onwards.</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">FIRE Intersection</p>
                         <p className="text-3xl font-black text-[#990000] font-serif italic">
                           {roadmap.fireDate ? `Age ${Math.floor(roadmap.fireDate/12) + profile.age}` : `TBD`}
                         </p>
                      </div>
                   </div>

                   <div className="h-[450px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={roadmap.projection || []}>
                            <defs>
                               <linearGradient id="colorWealth" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#990000" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#990000" stopOpacity={0}/>
                               </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="age" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} dy={10} minTickGap={30} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} tickFormatter={(v) => `${(v/10000000).toFixed(1)}Cr`} />
                            <Tooltip 
                              content={({ active, payload }: any) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-white p-6 rounded-3xl shadow-2xl border border-neutral-100 min-w-[240px]">
                                      <p className="text-[10px] font-black uppercase text-neutral-400 mb-2 tracking-widest">Age {data.age} ({data.year})</p>
                                      <p className="text-3xl font-black text-[#990000] mb-1 font-serif italic tracking-tighter">{formatCurrency(data.wealth)}</p>
                                      <p className="text-xs font-bold text-neutral-500 mb-3">{data.equity}% Equity • {data.growthRate}% YoY Growth</p>
                                      {data.events && data.events.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-neutral-100 space-y-3">
                                          <p className="text-[9px] font-black uppercase text-red-500 tracking-widest">Life Goals Funded</p>
                                          {data.events.map((e: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center gap-4">
                                              <span className="text-xs font-bold text-neutral-800">{e.name}</span>
                                              <span className="text-xs font-black text-red-600">-{formatCurrency(e.amount)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area type="monotone" dataKey="wealth" stroke="#990000" strokeWidth={4} fillOpacity={1} fill="url(#colorWealth)" />
                            <ReferenceLine y={roadmap.totalTarget} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'FIRE TARGET', position: 'top', fill: '#f43f5e', fontSize: 10, fontWeight: 900 }} />
                            {roadmap.milestones.map((m: any) => (
                              <ReferenceLine 
                                key={m.name}
                                x={m.target_year - new Date().getFullYear() + profile.age} 
                                stroke="#f43f5e" 
                                strokeDasharray="5 5"
                                opacity={0.5}
                                label={{ value: m.name.substring(0, 10), position: 'bottom', fill: '#f43f5e', fontSize: 9, fontWeight: 900 }}
                              />
                            ))}
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>

                   {roadmap.isGap && (
                     <div className="mt-10 p-10 bg-red-50 border border-red-100 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-8 animate-pulse shadow-xl shadow-red-50">
                        <div className="w-16 h-16 bg-[#990000] rounded-2xl flex items-center justify-center text-white shrink-0">
                           <ShieldCheck className="w-8 h-8" />
                        </div>
                        <div className="space-y-2 text-center md:text-left">
                           <h3 className="text-xl font-black text-[#990000] font-serif uppercase italic tracking-tighter">Strategy Alert: Retirement Gap Detected</h3>
                           <p className="text-sm font-medium text-red-900 leading-relaxed">
                             Your projected wealth at age {profile.retirement_age} is <b>{formatCurrency(roadmap.projection[roadmap.projection.length-1].wealth)}</b>, which is below your FIRE target. Consider increasing your monthly investment by <b>{formatCurrency(roadmap.totalTarget * 0.001)}</b> to bridge the orbit.
                           </p>
                        </div>
                        <button className="bg-[#990000] text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap ml-auto" onClick={() => router.push('/onboarding')}>
                           Recalibrate Orbit
                        </button>
                     </div>
                   )}
                </div>

                {/* SWR Survival Insight */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="bg-white border border-neutral-200 rounded-[3rem] p-10 shadow-sm flex flex-col justify-between">
                      <div>
                         <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-8 flex items-center gap-2">
                           <BarChart3 className="w-4 h-4 text-[#990000]" /> CORNERSTONE ANALYSIS
                         </h3>
                         <div className="space-y-6">
                            <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100">
                               <p className="text-xs font-bold text-neutral-500 leading-relaxed uppercase tracking-widest mb-2">Strategy Alignment</p>
                               <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-[#990000] rounded-xl flex items-center justify-center text-white font-black text-xl">{profile.fire_preferences?.swr}%</div>
                                  <p className="text-xs font-semibold text-[#990000]">Your profile is tuned to a <b>{profile.fire_preferences?.swr}%</b> withdrawal rate, which balances stability and growth for a {105 - profile.retirement_age} year retirement duration.</p>
                               </div>
                            </div>
                         </div>
                      </div>
                      <div className="mt-8 pt-6 border-t border-neutral-100 flex items-center justify-between text-xs font-black uppercase text-[#990000] cursor-pointer" onClick={() => setActiveTab('tactics')}>
                         <span>Refine Strategy Metrics</span>
                         <ArrowUpRight className="w-4 h-4" />
                      </div>
                   </div>

                   <div className="bg-[#990000] text-white rounded-[3rem] p-12 shadow-2xl shadow-emerald-100 relative overflow-hidden group">
                      <Zap className="absolute -right-6 -bottom-6 w-48 h-48 opacity-10 group-hover:scale-110 transition-transform duration-1000" />
                      <div className="relative z-10 space-y-8">
                         <h3 className="text-lg font-black uppercase tracking-widest border-b border-white/20 pb-4">Engine Metrics</h3>
                         <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">Ideal Monthly SIP</p>
                            <p className="text-3xl font-black">{formatCurrency(profile.monthly_investment_budget)}</p>
                         </div>
                         <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">Blended Yield</p>
                            <p className="text-3xl font-black">{(profile.investments?.[0]?.expected_return || 10).toFixed(1)}% CAGR</p>
                         </div>
                      </div>
                   </div>
                </div>
             </>
           ) : (
             <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
                {/* Tactics View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="bg-white border border-neutral-200 rounded-[3rem] p-10 shadow-sm">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-10 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#990000]" /> RISK GLIDE PATH
                      </h3>
                      <div className="h-[220px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={roadmap.projection.filter((p:any) => p.age <= profile.retirement_age)}>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                               <XAxis dataKey="age" hide />
                               <YAxis domain={[0, 100]} hide />
                               <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontWeight: 900 }} />
                               <Line type="monotone" dataKey="equity" stroke="#990000" strokeWidth={4} dot={false} name="Equity %" />
                            </LineChart>
                         </ResponsiveContainer>
                      </div>
                      <div className="mt-4 flex justify-between text-[10px] font-black uppercase text-neutral-400">
                         <span>Age {profile.age} (80%)</span>
                         <span>Retirement (30%)</span>
                      </div>
                   </div>

                   <div className="bg-white border border-neutral-200 rounded-[3rem] p-10 shadow-sm">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-10 flex items-center gap-2">
                        <LineIcon className="w-4 h-4 text-[#990000]" /> WITHDRAWAL VITALITY
                      </h3>
                      <div className="space-y-4">
                         {roadmap.swrAnalysis?.map((s: any) => (
                           <div key={s.swr} className={`flex items-center justify-between p-5 rounded-2xl transition-colors cursor-pointer group ${s.swr === profile.fire_preferences?.swr ? 'bg-[#990000]/5 border border-[#990000]/20' : 'bg-neutral-50 hover:bg-neutral-100'}`}>
                              <div className="flex items-center gap-4">
                                 <span className={`text-xs font-black uppercase tracking-widest ${s.swr === profile.fire_preferences?.swr ? 'text-[#990000]' : 'text-neutral-500'}`}>{s.swr}% SWR</span>
                                 {s.swr === profile.fire_preferences?.swr && <span className="text-[8px] font-black uppercase bg-[#990000] text-white px-2 py-0.5 rounded">Your Rate</span>}
                              </div>
                              <div className="flex items-center gap-6">
                                 <div className="text-right">
                                    <p className={`text-sm font-black ${s.safe ? 'text-emerald-600' : 'text-red-500'}`}>{s.survivalYears} yrs</p>
                                    <p className="text-[9px] font-bold text-neutral-400 uppercase">{s.survivalRate}% survival</p>
                                 </div>
                                 <div className={`w-2.5 h-2.5 rounded-full ${s.safe ? 'bg-emerald-500' : 'bg-red-400'} shadow-sm`} />
                              </div>
                           </div>
                         ))}
                      </div>
                      <p className="text-[9px] font-medium text-neutral-400 mt-6 text-center leading-relaxed">Based on {formatCurrency(roadmap.projection?.[roadmap.projection.length-1]?.wealth || 0)} corpus at age {profile.retirement_age}, 6% inflation, 7% post-retire returns.</p>
                   </div>
                </div>

                <div className="bg-[#990000] text-white rounded-[4rem] p-12 shadow-2xl shadow-red-100 flex flex-col md:flex-row items-center justify-between gap-10">
                   <div className="space-y-2 text-center md:text-left">
                      <h3 className="text-2xl font-black tracking-tighter">Optimize for Early Orbit?</h3>
                      <p className="text-white/60 text-sm font-medium">Increasing your monthly deployment by 10k brings retirement forward by 4.2 years.</p>
                   </div>
                   <button className="bg-white text-[#990000] px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-black/10">
                      Sync Strategy
                   </button>
                </div>
             </div>
           )}
        </div>
      </main>

      {/* Floating Chatbot Toggle */}
      <button 
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-neutral-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-all z-50 print:hidden"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Chatbot Window */}
      {isChatOpen && (
        <div className="fixed bottom-8 right-8 w-96 h-[600px] max-h-[80vh] bg-white rounded-3xl shadow-2xl border border-neutral-200 flex flex-col z-[1001] overflow-hidden animate-in slide-in-from-bottom-5 print:hidden">
           <div className="bg-neutral-900 p-6 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-[#990000] flex items-center justify-center font-serif italic font-black text-xs">ET</div>
                 <div>
                    <h3 className="text-sm font-black tracking-tight">ET Wealth AI</h3>
                    <p className="text-[10px] text-neutral-400">Powered by Llama-3 API</p>
                 </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-neutral-400 hover:text-white"><X className="w-5 h-5" /></button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[85%] rounded-2xl p-4 text-sm font-medium leading-relaxed ${msg.role === 'user' ? 'bg-[#990000] text-white rounded-br-sm' : 'bg-white border border-neutral-100 shadow-sm text-neutral-700 rounded-bl-sm whitespace-pre-wrap'}`}>
                      {msg.content}
                   </div>
                </div>
              ))}
              {isChatTyping && (
                <div className="flex justify-start">
                   <div className="bg-white border border-neutral-100 shadow-sm rounded-2xl rounded-bl-sm p-4 text-neutral-400 flex gap-2">
                     <div className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce" />
                     <div className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce delay-75" />
                     <div className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce delay-150" />
                   </div>
                </div>
              )}
           </div>

           <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-neutral-100 flex gap-2">
              <input 
                 value={chatInput}
                 onChange={e => setChatInput(e.target.value)}
                 placeholder="Ask about your financial orbit..." 
                 className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#990000] transition-colors"
              />
              <button disabled={!chatInput.trim() || isChatTyping} className="p-3 bg-neutral-900 text-white rounded-xl disabled:opacity-50 transition-all hover:bg-neutral-800 focus:scale-95">
                <Send className="w-4 h-4" />
              </button>
           </form>
        </div>
      )}
    </div>
  );
}
