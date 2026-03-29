"use client";

import React, { useEffect, useState, ChangeEvent } from "react";
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
   Send,
   Home,
   Activity
} from "lucide-react";
import {
   calculateNetWorthProjection,
   calculateMonthlySurplus,
   calculateNetWorthWithMortgage,
   recommendHealthCover
} from "../../lib/calculations/fireCalculator";

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
   const [chatMessages, setChatMessages] = useState<{ role: string, content: string }[]>([]);
   const [chatInput, setChatInput] = useState("");
   const [isChatTyping, setIsChatTyping] = useState(false);

   useEffect(() => {
      const fetchData = async () => {
         try {
            const localData = typeof window !== 'undefined' ? localStorage.getItem('et_explorer_profile') : null;
            if (localData) {
               console.log("Loading dashboard from local storage fallback");
               const data = JSON.parse(localData);
               
               // Map local storage format to expected format just in case it's flat
               const mappedData = {
                  ...data.personal,
                  investments: data.investments || [],
                  goals: data.goals || [],
                  health_insurance: data.health_insurance ? [data.health_insurance] : [],
                  fire_preferences: data.fire_preferences || {}
               };
               
               setProfile(mappedData);
               const calculatedState = calculateRoadmap(mappedData);
               setRoadmap(calculatedState);
               setLoading(false);
               return;
            }

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
               const calculatedState = calculateRoadmap(data);
               setRoadmap(calculatedState);
               setLoading(false);
            }
         } catch (err) {
            console.error("Dashboard init failed:", err);
            router.push("/onboarding");
         }
      };
      fetchData();
   }, [router]);

   const calculateRoadmap = (profile: any) => {
      const monthlyExpenses = profile.monthly_expenses || 40000;
      const monthlyIncome = profile.monthly_income || 100000;
      const emi = profile.home_loan_emi || 0;
      const healthIns = profile.health_insurance?.[0];
      const healthPremiumMonthly = (healthIns?.annual_premium || 0) / 12;

      const monthlySurplus = calculateMonthlySurplus(
         monthlyIncome,
         monthlyExpenses,
         emi,
         healthPremiumMonthly
      );

      const wr = profile.fire_preferences?.swr || 4.0;
      const fireTarget = (monthlyExpenses * 12) / (wr / 100);
      const cushion = monthlyExpenses * 12 * 2;
      const totalTarget = fireTarget + cushion;

      const startAge = profile.age || 30;
      const retireAge = profile.retirement_age || 60;

      const currentWealth = calculateNetWorthWithMortgage(
         profile.current_savings || 0,
         profile.property_value || 0,
         profile.home_loan_outstanding || 0
      );

      const milestones = profile.goals?.filter((g: any) => g.name !== 'FIRE') || [];

      const projection = calculateNetWorthProjection(
         profile,
         profile.investments || [],
         milestones,
         monthlySurplus
      ) || [];

      const retireData = projection.length > 0 ? (projection.find(p => p.age === retireAge) || projection[projection.length - 1]) : null;
      const retireCorpus = retireData?.wealth || 0;
      const isGap = retireCorpus < totalTarget;

      const swrAnalysis = [3.0, 3.5, 4.0, 4.5].map(testSwr => {
         let corpus = retireCorpus;
         const annualExpense = Math.max(0, monthlyExpenses * 12);
         const inflation = 0.06;
         const postRetireReturn = 0.07;
         let survivalYears = 0;
         const retireDuration = Math.max(1, 105 - retireAge);

         for (let y = 0; y < retireDuration; y++) {
            const withdraw = annualExpense * Math.pow(1 + inflation, y) * (testSwr / wr);
            corpus = corpus * (1 + postRetireReturn) - withdraw;
            if (corpus <= 0) break;
            survivalYears++;
         }

         const survivalRate = Math.min(100, Math.round((survivalYears / retireDuration) * 100));
         return { swr: testSwr, survivalYears, survivalRate, safe: survivalYears >= retireDuration };
      });

      const healthRecommendation = recommendHealthCover(
         healthIns?.sum_insured || 0,
         healthIns?.family_members_covered || 1,
         profile.age || 30,
         healthIns?.city_tier || 'tier1'
      );
      const healthAdequacy = healthIns ? (healthIns.sum_insured / healthRecommendation.recommendedCover) * 100 : 0;

      return {
         totalTarget,
         fireTarget,
         cushion,
         projection,
         fireDate: projection.find(p => p.investmentCorpus >= totalTarget)?.age || null,
         yearsToRetire: retireAge - startAge,
         milestones,
         isGap,
         swrAnalysis,
         currentWealth,
         healthAdequacy,
         healthRecommendation
      };
   };

   const formatCurrency = (val: number) => {
      if (val >= 10000000) return `₹${(val / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
      if (val >= 100000) return `₹${(val / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} L`;
      return `₹${Math.floor(val).toLocaleString('en-IN')}`;
   };

   // Initialize Chatbot when roadmap loads
   useEffect(() => {
      if (roadmap && chatMessages.length === 0) {
         setChatMessages([
            { role: 'assistant', content: `Hello! I'm your ET Wealth AI. I've analyzed your orbit and I see you are aiming for a ${formatCurrency(roadmap.totalTarget)} corpus by age ${roadmap.fireDate ? Math.floor(roadmap.fireDate / 12) + profile.age : profile.retirement_age}. \n\nYou are currently investing ${formatCurrency(profile.monthly_investment_budget)} monthly. What questions can I answer about your FIRE strategy?` }
         ]);
      }
   }, [roadmap, profile]);

   const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim()) return;

      const userMsg = chatInput.trim();
      setChatInput("");
      setChatMessages((prev: { role: string; content: string }[]) => [...prev, { role: 'user', content: userMsg }]);
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
                  fireAge: roadmap.fireDate ? Math.floor(roadmap.fireDate / 12) + profile.age : profile.retirement_age,
                  swr: profile.fire_preferences?.swr || 4.0,
                  monthlySip: formatCurrency(profile.monthly_investment_budget)
               }
            })
         });

         const data = await response.json();
         setChatMessages((prev: { role: string; content: string }[]) => [...prev, { role: 'assistant', content: data.reply }]);
      } catch (error) {
         setChatMessages((prev: any[]) => [...prev, { role: 'assistant', content: "Local LLM server not responding. Did you start Ollama?" }]);
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
      <div className="min-h-screen bg-white text-black font-black opacity-100 font-sans">
         <header className="bg-white border-b-2 border-black sticky top-0 z-[1000] shadow-sm">
            <div className="max-w-[1400px] mx-auto px-8 py-6 flex items-center justify-between">
               <div className="flex items-center gap-10">
                  <Link href="/" className="flex items-center gap-4 group">
                     <div className="w-10 h-10 bg-[#990000] rounded-lg flex items-center justify-center text-white font-serif italic text-xl font-black shadow-lg shadow-red-200 group-hover:scale-105 transition-transform">
                        ET
                     </div>
                     <h1 className="text-2xl font-black tracking-tighter text-black font-black opacity-100 font-serif lowercase italic">explorer</h1>
                  </Link>

                  <div className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-black font-black font-bold print:hidden">
                     <Link href="/" className="hover:text-[#990000] transition-colors">Home</Link>
                     <Link href="/dashboard" className="text-[#990000]">Dashboard</Link>
                  </div>
                  <div className="flex bg-neutral-100 p-1 rounded-xl print:hidden">
                     <button onClick={() => setActiveTab('orbit')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'orbit' ? "bg-white shadow-sm text-[#990000]" : "text-black font-black hover:text-black font-black opacity-100"}`}>Wealth Orbit</button>
                     <button onClick={() => setActiveTab('tactics')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'tactics' ? "bg-white shadow-sm text-[#990000]" : "text-black font-black hover:text-black font-black opacity-100"}`}>Tactical Explorer</button>
                  </div>
               </div>
               <div className="flex items-center gap-4">
                  <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-black font-black rounded-xl hover:bg-neutral-200 transition-colors text-xs font-bold uppercase tracking-widest hidden md:flex print:hidden">
                     <Download className="w-4 h-4" /> Export PDF
                  </button>
                  <button onClick={() => {
                     localStorage.removeItem('et_explorer_profile');
                     supabase.auth.signOut().then(() => router.push("/"));
                  }} className="p-3 text-black font-black font-bold hover:text-[#990000] transition-colors print:hidden">
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

               <div className="bg-white border border-black border-2 rounded-[2.5rem] p-10 shadow-sm flex flex-col gap-8">
                  <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-black font-black font-bold mb-2">Net Worth (Excl. Home)</p>
                     <span className="text-3xl font-black text-black font-black opacity-100">{formatCurrency(profile.current_savings || 0)}</span>
                  </div>
                  <div className="pt-4 border-t border-neutral-100">
                     <p className="text-[10px] font-black uppercase tracking-widest text-[#990000] mb-2 flex items-center gap-2 font-black">
                        <Home className="w-3 h-3 text-[#990000]" /> Home Equity
                     </p>
                     <div className="flex justify-between items-end">
                        <span className="text-2xl font-black text-black font-black opacity-100">{formatCurrency((profile.property_value || 0) - (profile.home_loan_outstanding || 0))}</span>
                        <span className="text-[10px] font-bold text-black font-black font-bold">LTV: {profile.property_value ? Math.round((profile.home_loan_outstanding / profile.property_value) * 100) : 0}%</span>
                     </div>
                  </div>
                  <div className="pt-6 border-t border-neutral-100">
                     <p className="text-[10px] font-black uppercase tracking-widest text-black font-black font-bold mb-2">Health Protection</p>
                     <div className="flex items-center gap-4">
                        <span className={`text-2xl font-black ${roadmap.healthAdequacy >= 100 ? 'text-emerald-500' : 'text-orange-500'}`}>{Math.round(roadmap.healthAdequacy)}%</span>
                        <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                           <div className={`h-full ${roadmap.healthAdequacy >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(100, roadmap.healthAdequacy)}%` }} />
                        </div>
                     </div>
                     <p className="text-[9px] font-bold text-black font-black font-bold mt-2 uppercase">Target: {formatCurrency(roadmap.healthRecommendation?.recommendedCover || 0)}</p>
                  </div>
               </div>
            </div>

            {/* Right Main Content */}
            <div className="col-span-12 lg:col-span-9 space-y-10">
               {activeTab === 'orbit' ? (
                  <>
                     {/* Growth Visualization */}
                     <div className="bg-white border border-black border-2 rounded-[3rem] p-12 shadow-sm">
                        <div className="flex items-end justify-between mb-12">
                           <div className="flex flex-col gap-2">
                              <h2 className="text-5xl font-black tracking-tighter text-black font-black opacity-100 font-serif italic uppercase">Wealth Orbit</h2>
                              <p className="text-black font-black text-sm font-medium">Lifecycle Report from Age {profile.age} onwards.</p>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black uppercase tracking-widest text-black font-black font-bold mb-1">FIRE Intersection</p>
                              <p className="text-3xl font-black text-[#990000] font-serif italic">
                                 {roadmap.fireDate ? `Age ${Math.floor(roadmap.fireDate / 12) + profile.age}` : `TBD`}
                              </p>
                           </div>
                        </div>

                        <div className="h-[450px] w-full">
                           <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={roadmap.projection || []}>
                                 <defs>
                                    <linearGradient id="colorWealth" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="#990000" stopOpacity={0.1} />
                                       <stop offset="95%" stopColor="#990000" stopOpacity={0} />
                                    </linearGradient>
                                 </defs>
                                 <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
                                 <XAxis dataKey="age" axisLine={false} tickLine={false} tick={{ fill: '#000000', fontSize: 10, fontWeight: 900 }} dy={10} minTickGap={30} />
                                 <YAxis axisLine={false} tickLine={false} tick={{ fill: '#000000', fontSize: 10, fontWeight: 900 }} tickFormatter={(v) => `${(v / 10000000).toFixed(1)}Cr`} />
                                 <Tooltip
                                    content={({ active, payload }: any) => {
                                       if (active && payload && payload.length) {
                                          const data = payload[0].payload;
                                          return (
                                             <div className="bg-white p-6 rounded-3xl shadow-2xl border border-neutral-100 min-w-[240px]">
                                                <p className="text-[10px] font-black uppercase text-black font-black font-bold mb-2 tracking-widest">Age {data.age}</p>
                                                <p className="text-3xl font-black text-[#990000] mb-1 font-serif italic tracking-tighter">{formatCurrency(data.wealth)}</p>
                                                <p className="text-xs font-bold text-black font-black mb-1">{data.equity}% Equity</p>
                                                {data.sunkCosts > 0 && (
                                                   <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest mt-2 border-t pt-2 border-neutral-100">
                                                      Money Gone (EMI+Premiums): {formatCurrency(data.sunkCosts)}
                                                   </p>
                                                )}
                                                {data.homePayoffAge === data.age && (
                                                   <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mt-2 border-t pt-2 border-neutral-100">
                                                      🎉 Home fully paid off!
                                                   </p>
                                                )}
                                             </div>
                                          );
                                       }
                                       return null;
                                    }}
                                 />
                                 <Area type="monotone" dataKey="wealth" stroke="#990000" strokeWidth={4} fillOpacity={1} fill="url(#colorWealth)" />
                                 <Area type="monotone" dataKey="sunkCosts" stroke="#f97316" strokeWidth={2} fillOpacity={0} />
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
                                 {roadmap.projection?.find((p: any) => p.homePayoffAge)?.homePayoffAge && (
                                    <ReferenceLine
                                       x={roadmap.projection.find((p: any) => p.homePayoffAge).homePayoffAge}
                                       stroke="#10b981"
                                       strokeDasharray="4 4"
                                       label={{ value: 'HOME OWNR', position: 'insideTopLeft', fill: '#10b981', fontSize: 9, fontWeight: 900 }}
                                    />
                                 )}
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
                                    Your projected wealth at age {profile.retirement_age} is <b>{formatCurrency(roadmap.projection?.[roadmap.projection.length - 1]?.wealth || 0)}</b>, which is below your FIRE target. Consider increasing your monthly investment by <b>{formatCurrency(roadmap.totalTarget * 0.001)}</b> to bridge the orbit.
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
                        <div className="bg-white border border-black border-2 rounded-[3rem] p-10 shadow-sm flex flex-col justify-between">
                           <div>
                              <h3 className="text-[10px] font-black uppercase tracking-widest text-black font-black font-bold mb-8 flex items-center gap-2">
                                 <BarChart3 className="w-4 h-4 text-[#990000]" /> CORNERSTONE ANALYSIS
                              </h3>
                              <div className="space-y-6">
                                 <div className="p-6 bg-white rounded-2xl border border-neutral-100">
                                    <p className="text-xs font-bold text-black font-black leading-relaxed uppercase tracking-widest mb-2">Strategy Alignment</p>
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
                                 <p className="text-white font-black uppercase tracking-widest opacity-100 mb-2">Ideal Monthly SIP</p>
                                 <p className="text-3xl font-black">{formatCurrency(profile.monthly_investment_budget)}</p>
                              </div>
                              <div>
                                 <p className="text-white font-black uppercase tracking-widest opacity-100 mb-2">Blended Yield</p>
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
                        <div className="bg-white border border-black border-2 rounded-[3rem] p-10 shadow-sm">
                           <h3 className="text-[10px] font-black uppercase tracking-widest text-black font-black mb-10 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-[#990000]" /> RISK GLIDE PATH
                           </h3>
                           <div className="h-[220px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                 <LineChart data={roadmap.projection.filter((p: any) => p.age <= profile.retirement_age)}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="age" hide />
                                    <YAxis domain={[0, 100]} hide />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontWeight: 900 }} />
                                    <Line type="monotone" dataKey="equity" stroke="#990000" strokeWidth={4} dot={false} name="Equity %" />
                                 </LineChart>
                              </ResponsiveContainer>
                           </div>
                           <div className="mt-4 flex justify-between text-[10px] font-black uppercase text-black font-black font-bold">
                              <span>Age {profile.age} (80%)</span>
                              <span>Retirement (30%)</span>
                           </div>
                        </div>

                        <div className="bg-white border border-black border-2 rounded-[3rem] p-10 shadow-sm">
                           <h3 className="text-[10px] font-black uppercase tracking-widest text-black font-black mb-10 flex items-center gap-2">
                              <LineIcon className="w-4 h-4 text-[#990000]" /> WITHDRAWAL VITALITY
                           </h3>
                           <div className="space-y-4">
                              {roadmap.swrAnalysis?.map((s: any) => (
                                 <div key={s.swr} className={`flex items-center justify-between p-5 rounded-2xl transition-colors cursor-pointer group ${s.swr === profile.fire_preferences?.swr ? 'bg-[#990000]/5 border border-[#990000]/20' : 'bg-white hover:bg-neutral-100'}`}>
                                    <div className="flex items-center gap-4">
                                       <span className={`text-xs font-black uppercase tracking-widest ${s.swr === profile.fire_preferences?.swr ? 'text-[#990000]' : 'text-black font-black'}`}>{s.swr}% SWR</span>
                                       {s.swr === profile.fire_preferences?.swr && <span className="text-[8px] font-black uppercase bg-[#990000] text-white px-2 py-0.5 rounded">Your Rate</span>}
                                    </div>
                                    <div className="flex items-center gap-6">
                                       <div className="text-right">
                                          <p className={`text-sm font-black ${s.safe ? 'text-emerald-600' : 'text-red-500'}`}>{s.survivalYears} yrs</p>
                                          <p className="text-[9px] font-bold text-black font-black font-bold uppercase">{s.survivalRate}% survival</p>
                                       </div>
                                       <div className={`w-2.5 h-2.5 rounded-full ${s.safe ? 'bg-emerald-500' : 'bg-red-400'} shadow-sm`} />
                                    </div>
                                 </div>
                              ))}
                           </div>
                           <p className="text-[9px] font-medium text-black font-black font-bold mt-6 text-center leading-relaxed">Based on {formatCurrency(roadmap.projection?.[roadmap.projection.length - 1]?.wealth || 0)} corpus at age {profile.retirement_age}, 6% inflation, 7% post-retire returns.</p>
                        </div>
                     </div>

                     <div className="bg-[#990000] text-white rounded-[4rem] p-12 shadow-2xl shadow-red-100 flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="space-y-2 text-center md:text-left">
                           <h3 className="text-2xl font-black tracking-tighter">Optimize for Early Orbit?</h3>
                           <p className="text-black font-black uppercase tracking-widest opacity-100">Increasing your monthly deployment by 10k brings retirement forward by 4.2 years.</p>
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
            <div className="fixed bottom-8 right-8 w-96 h-[600px] max-h-[80vh] bg-white rounded-3xl shadow-2xl border border-black border-2 flex flex-col z-[1001] overflow-hidden animate-in slide-in-from-bottom-5 print:hidden">
               <div className="bg-neutral-900 p-6 flex justify-between items-center text-white">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-[#990000] flex items-center justify-center font-serif italic font-black text-xs">ET</div>
                     <div>
                        <h3 className="text-sm font-black tracking-tight">ET Wealth AI</h3>
                        <p className="text-[10px] text-black font-black font-bold">Powered by Llama-3 API</p>
                     </div>
                  </div>
                  <button onClick={() => setIsChatOpen(false)} className="text-black font-black font-bold hover:text-white"><X className="w-5 h-5" /></button>
               </div>

               <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                  {chatMessages.map((msg, i) => (
                     <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-4 text-sm font-medium leading-relaxed ${msg.role === 'user' ? 'bg-[#990000] text-white rounded-br-sm' : 'bg-white border-2 border-black shadow-none text-black rounded-bl-sm whitespace-pre-wrap'}`}>
                           {msg.content}
                        </div>
                     </div>
                  ))}
                  {isChatTyping && (
                     <div className="flex justify-start">
                        <div className="bg-white border border-neutral-100 shadow-sm rounded-2xl rounded-bl-sm p-4 text-black font-black font-bold flex gap-2">
                           <div className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce" />
                           <div className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce delay-75" />
                           <div className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce delay-150" />
                        </div>
                     </div>
                  )}
               </div>

               <form onSubmit={handleSendMessage} className="p-4 bg-white border-t-2 border-black flex gap-2">
                  <input
                     value={chatInput}
                     onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChatInput(e.target.value)}
                     placeholder="Ask about your financial orbit..."
                     className="flex-1 bg-white border border-black border-2 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#990000] transition-colors"
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
