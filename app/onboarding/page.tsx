"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle, 
  BarChart, 
  TrendingUp,
  Target,
  ShieldCheck,
  PiggyBank,
  Receipt,
  Zap,
  Flame,
  User,
  Info
} from "lucide-react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { saveFullProfile } from "../../lib/api";

const STEPS_TOTAL = 9;

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // State matching the Antigravity Prompt
  const [state, setState] = useState({
    monthly: 80000,
    expenseMultiplier: 1.0,
    currentAge: 30,
    retirementAge: 60,
    currentCorpus: 1000000,
    monthlySIP: 20000,
    sipStepUp: 0,
    equity: 70,
    debt: 20,
    cash: 10,
    wr: 4.0,
    cushionYears: 1,
    milestones: [
      { id: 1, name: 'Home Purchase', amount: 0, targetYear: new Date().getFullYear() + 5 },
      { id: 2, name: 'Education', amount: 0, targetYear: new Date().getFullYear() + 10 }
    ]
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) setUser(data.session.user);
      else {
        const { data: signData } = await supabase.auth.signInAnonymously();
        if (signData?.user) setUser(signData.user);
      }
    };
    checkUser();
  }, []);

  const yearsToRetire = state.retirementAge - state.currentAge;
  const duration = 105 - state.retirementAge;
  const fireTarget = (state.monthly * state.expenseMultiplier * 12) / (state.wr / 100);
  const totalTarget = fireTarget + (state.monthly * state.expenseMultiplier * 12 * state.cushionYears);

  const formatCurrency = (n: number) => {
    if (n >= 10000000) return "₹" + (n/10000000).toFixed(2) + " Cr";
    if (n >= 100000) return "₹" + (n/100000).toFixed(1) + "L";
    return "₹" + Math.round(n).toLocaleString("en-IN");
  };

  const nextStep = async () => {
    if (currentStep < STEPS_TOTAL) setCurrentStep(s => s + 1);
    else {
      setLoading(true);
      try {
        // Map to DB Schema
        const fullProfile = {
          personal: {
            age: state.currentAge,
            retirement_age: state.retirementAge,
            monthly_income: state.monthlySIP * 3, // Mocking income
            monthly_expenses: state.monthly * state.expenseMultiplier,
            current_savings: state.currentCorpus,
            monthly_investment_budget: state.monthlySIP,
            risk_tolerance: state.equity > 60 ? "aggressive" : "moderate",
            tax_regime: "new"
          },
          investments: [
            { asset_class: "Equity", current_value: (state.currentCorpus * state.equity/100), expected_return: 12 },
            { asset_class: "Debt", current_value: (state.currentCorpus * (state.debt + state.cash)/100), expected_return: 7 }
          ],
          goals: [
            ...state.milestones.filter((m: any) => m.amount > 0).map((m: any) => ({ name: m.name, target_year: m.targetYear, target_amount: m.amount })),
            { name: "FIRE", target_year: new Date().getFullYear() + yearsToRetire, target_amount: totalTarget }
          ],
          insurance: { life_coverage: 0, health_coverage: 0 },
          fire_preferences: { swr: state.wr, fire_type: "regular", strategy: "fixed", glide_path: true }
        };
        await saveFullProfile(user.id, fullProfile as any);
        router.push("/dashboard");
      } catch (err) {
        console.error("Save failed:", err);
      } finally {
        setLoading(false);
      }
    }
  };
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col selection:bg-[#990000] selection:text-white">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-[100] shadow-sm shrink-0">
        <div className="max-w-[1400px] mx-auto px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-10">
               <Link href="/" className="flex items-center gap-4 group">
                  <div className="w-10 h-10 bg-[#990000] rounded-lg flex items-center justify-center text-white font-serif italic text-xl font-black shadow-lg shadow-red-200 group-hover:scale-105 transition-transform">
                    ET
                  </div>
                  <h1 className="text-2xl font-black tracking-tighter text-neutral-900 font-serif lowercase italic">explorer</h1>
               </Link>
               
               <div className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-neutral-400">
                 <Link href="/" className="hover:text-[#990000] transition-colors">Home</Link>
                 <Link href="/dashboard" className="text-[#990000]">Dashboard</Link>
               </div>
            </div>
            <Link 
              href="/dashboard" 
              className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              Skip to Dashboard
            </Link>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row max-w-[1400px] w-full mx-auto overflow-hidden">
      
      {/* Sidebar - Visible from Step 1 */}
      <div className="hidden md:flex w-[380px] bg-white border-r border-neutral-200 p-10 flex-col gap-10 sticky top-0 h-screen overflow-y-auto">
         <div>
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-8">Snapshot Report</h2>
            <div className="space-y-6">
               <div className="border-b border-neutral-100 pb-4">
                  <p className="text-[10px] uppercase font-bold text-neutral-400 mb-1">Target Corpus</p>
                  <p className="text-2xl font-black text-[#990000] tracking-tight">{formatCurrency(totalTarget)}</p>
               </div>
               <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-neutral-400 mb-1">Retire At</p>
                    <p className="text-lg font-bold text-neutral-900">Age {state.retirementAge}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-neutral-400 mb-1">Safe Rate</p>
                    <p className="text-lg font-bold text-neutral-900">{state.wr}%</p>
                  </div>
               </div>
               <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase text-neutral-400 mb-2">
                       <span>Readiness</span>
                       <span className="text-[#990000]">8%</span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                       <div className="h-full bg-[#990000]" style={{ width: '8%' }} />
                    </div>
                  </div>
               </div>
            </div>
         </div>

         <div className="mt-auto bg-neutral-50 rounded-3xl p-6 border border-neutral-100 italic text-neutral-500 text-xs leading-relaxed">
            "By investing {formatCurrency(state.monthlySIP)} monthly, you are building a runway that will last {duration} years in retirement."
         </div>
      </div>

      {/* Main Walkthrough Container */}
      <div className="flex-1 flex flex-col p-6 md:p-12 lg:p-20 overflow-y-auto">
          {/* Progress Bar */}
          <div className="w-full h-1 bg-neutral-200 rounded-full mb-20 overflow-hidden">
             <div className="h-full bg-[#990000] transition-all duration-500" style={{ width: `${(currentStep / STEPS_TOTAL) * 100}%` }} />
          </div>

          <main className="max-w-xl">
             <AnimatePresence mode="wait">
                <motion.div 
                   key={currentStep}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   className="space-y-12"
                >
                   {/* Conversational Explanation */}
                   <div className="border-l-4 border-[#990000] pl-8 space-y-4">
                      <p className="text-neutral-500 text-lg leading-relaxed font-medium">
                         {getExplanation(currentStep, state)}
                      </p>
                   </div>

                   {/* Step Interaction */}
                   <div className="space-y-10">
                      {renderStepInput(currentStep, state, setState)}
                   </div>
                </motion.div>
             </AnimatePresence>

             {/* Navigation */}
             <div className="mt-20 pt-10 border-t border-neutral-100 flex items-center justify-between">
                <button 
                   onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
                   className={`text-neutral-400 font-bold text-xs uppercase tracking-widest hover:text-neutral-900 transition-colors ${currentStep === 1 ? 'invisible' : ''}`}
                >
                   ← Go Back
                </button>
                <button 
                   onClick={nextStep}
                   disabled={loading}
                   className="bg-[#990000] text-white px-10 py-5 rounded-2xl font-bold tracking-widest text-xs uppercase hover:bg-black transition-all shadow-lg shadow-red-100 disabled:opacity-50"
                >
                   {currentStep === STEPS_TOTAL ? (loading ? 'Saving Orbit...' : 'Finish Explorer') : 'Continue Discovery'}
                </button>
             </div>
          </main>
      </div>

      {/* Mobile Sticky Bar */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-neutral-200 p-4 flex justify-between items-center z-50">
         <div className="flex flex-col">
            <span className="text-[10px] font-bold text-neutral-400 uppercase">FIRE Target</span>
            <span className="text-lg font-black text-[#990000]">{formatCurrency(totalTarget)}</span>
         </div>
         <div className="flex flex-col text-right">
            <span className="text-[10px] font-bold text-neutral-400 uppercase">On Track</span>
            <span className="text-lg font-black text-[#990000]">8%</span>
         </div>
      </div>
      </div>
    </div>
  );
}

function getExplanation(step: number, state: any) {
  switch(step) {
    case 1: return "First things first — how much do you actually spend each month? Include everything from rent to bills. If you're not sure, look at your monthly savings vs your salary.";
    case 2: return "Retirement duration is the single biggest factor in your FIRE number. A longer runway means we need to be more conservative with your withdrawal rates.";
    case 3: return "You're probably not starting from zero. Mutual funds, EPF, savings—all of it counts. We calculate how this amount grows by the time you stop working.";
    case 4: return "Now — how much can you set aside every month? This is your SIP amount. We'll also factor in if you expect your income to grow over time.";
    case 5: return "Life isn't just about retiring. You might want to buy a house or fund a child's education. These 'lumpy' expenses can derail a plan if not factored in early.";
    case 6: return "Where you put your money matters. As you grow older, you should gradually shift from risky stocks to stable bonds. This is called a 'Glide Path'.";
    case 7: return "Inflation is the sneaky enemy. India averages around 6% historically. We've suggested a withdrawal rate based on your planned retirement duration.";
    case 8: return "A safety buffer prevents selling stocks during a market crash. We suggest keeping 1-2 years of expenses in cash or FDs separate from investments.";
    case 9: return "We've finished our discovery. We can now project exactly when you reach orbit and what your financial roadmap looks like.";
    default: return "";
  }
}

function renderStepInput(step: number, state: any, setState: any) {
  const formatCurrency = (n: number) => {
    if (n >= 10000000) return "₹" + (n/10000000).toFixed(2) + " Cr";
    if (n >= 100000) return "₹" + (n/100000).toFixed(1) + "L";
    return "₹" + Math.round(n).toLocaleString("en-IN");
  };

  switch(step) {
    case 1:
      return (
        <div className="space-y-8">
           <div className="flex justify-between items-end">
              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Monthly Expenses</span>
              <span className="text-4xl font-black text-indigo-600 tracking-tighter">{formatCurrency(state.monthly)}</span>
           </div>
           <input type="range" min={10000} max={500000} step={5000} value={state.monthly} onChange={e => setState({...state, monthly: parseInt(e.target.value)})} className="w-full accent-[#990000] h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer" />
           <div className="flex gap-4">
              {[0.85, 1.0, 1.15].map(v => (
                <button 
                  key={v} 
                  onClick={() => setState({...state, expenseMultiplier: v})}
                  className={`flex-1 p-5 rounded-2xl border transition-all text-xs font-bold ${state.expenseMultiplier === v ? 'bg-[#990000] text-white border-[#990000] shadow-xl' : 'bg-white text-neutral-400 border-neutral-100 hover:border-indigo-100 underline decoration-indigo-200'}`}
                >
                  {v === 0.85 ? 'Less (Lean)' : v === 1.0 ? 'Default' : 'More (Fat)'}
                </button>
              ))}
           </div>
           <div className="p-6 bg-emerald-50 rounded-2xl text-emerald-700 text-xs font-medium leading-relaxed">
             Planning for a retirement lifestyle of <b>{formatCurrency(state.monthly * state.expenseMultiplier)}/month</b> in today's money.
           </div>
        </div>
      );
    case 2:
      return (
        <div className="space-y-10">
           <div className="grid grid-cols-2 gap-10">
              <div className="space-y-2">
                 <p className="text-[10px] uppercase font-black text-neutral-400 tracking-widest">Current Age</p>
                 <input type="number" 
                    value={state.currentAge} 
                    onChange={e => setState({...state, currentAge: parseInt(e.target.value) || 0})}
                    className="w-full p-6 text-3xl font-black bg-white border border-neutral-100 rounded-3xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                 />
              </div>
              <div className="space-y-2">
                 <p className="text-[10px] uppercase font-black text-neutral-400 tracking-widest">Retirement Age</p>
                 <input type="number" 
                    value={state.retirementAge} 
                    onChange={e => setState({...state, retirementAge: parseInt(e.target.value) || 0})}
                    className="w-full p-6 text-3xl font-black bg-white border border-neutral-100 rounded-3xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                 />
              </div>
           </div>
           <div className="p-6 bg-indigo-50 rounded-2xl text-indigo-700 text-xs font-medium border border-indigo-100 flex items-center gap-4">
              <div className="w-10 h-10 bg-[#990000] rounded-xl flex items-center justify-center text-white font-black text-xs">{105 - state.retirementAge}</div>
              <span>Your corpus needs to last approximately <b>{105 - state.retirementAge} years</b>.</span>
           </div>
        </div>
      );
    case 3:
      return (
        <div className="space-y-10">
           <div className="flex justify-between items-end">
              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Current Net Worth</span>
              <span className="text-4xl font-black text-indigo-600 tracking-tighter">{formatCurrency(state.currentCorpus)}</span>
           </div>
           <input type="range" min={0} max={50000000} step={100000} value={state.currentCorpus} onChange={e => setState({...state, currentCorpus: parseInt(e.target.value)})} className="w-full accent-[#990000] h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer" />
           <div className="p-6 border border-neutral-100 rounded-2xl space-y-2">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Projected Growth</p>
              <p className="text-sm font-medium text-neutral-600">At 10% CAGR, your portfolio will reach <b>{formatCurrency(state.currentCorpus * Math.pow(1.1, (state.retirementAge - state.currentAge)))}</b> by the day you retire.</p>
           </div>
        </div>
      );
    case 4:
      return (
        <div className="space-y-10">
           <div className="flex justify-between items-end">
              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Monthly Investment</span>
              <span className="text-4xl font-black text-emerald-600 tracking-tighter">{formatCurrency(state.monthlySIP)}</span>
           </div>
           <input type="range" min={1000} max={200000} step={1000} value={state.monthlySIP} onChange={e => setState({...state, monthlySIP: parseInt(e.target.value)})} className="w-full accent-[#990000] h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer" />
           <div className="space-y-3">
              <p className="text-[10px] uppercase font-black text-neutral-400 tracking-widest">Income Step-Up (Annual Growth)</p>
              <div className="flex gap-4">
                 {[0, 0.07, 0.12].map(v => (
                   <button 
                     key={v}
                     onClick={() => setState({...state, sipStepUp: v})}
                     className={`flex-1 p-5 rounded-2xl border transition-all text-xs font-bold ${state.sipStepUp === v ? 'bg-[#1D9E75] text-white border-[#1D9E75] shadow-lg' : 'bg-white text-neutral-400 border-neutral-100 hover:border-emerald-100'}`}
                   >
                     {v === 0 ? 'Fixed SIP' : v === 0.07 ? '7% (Std)' : '12% (Agg)'}
                   </button>
                 ))}
              </div>
           </div>
        </div>
      );
    case 5:
      return (
        <div className="space-y-8">
           <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Major Life Milestones</p>
           <div className="space-y-6">
              {state.milestones.map((m: any, idx: number) => (
                <div key={m.id} className="p-10 bg-white border border-neutral-100 rounded-[2rem] space-y-8 shadow-sm relative group">
                   <button 
                     onClick={() => setState({...state, milestones: state.milestones.filter((_: any, i: number) => i !== idx)})}
                     className="absolute top-6 right-6 p-2 text-neutral-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                   >
                     <Zap className="w-4 h-4 rotate-45" />
                   </button>
                   <div className="space-y-2">
                       <input 
                         className="text-lg font-black text-neutral-900 bg-transparent outline-none focus:text-[#990000]" 
                         value={m.name} 
                         onChange={e => {
                           const newM = [...state.milestones];
                           newM[idx].name = e.target.value;
                           setState({...state, milestones: newM});
                         }}
                       />
                       <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Goal Name</p>
                   </div>
                   <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                         <span className="text-xl font-black text-[#990000]">{formatCurrency(m.amount)}</span>
                         <input 
                           type="range" min={0} max={25000000} step={500000} 
                           value={m.amount} 
                           onChange={e => {
                             const newM = [...state.milestones];
                             newM[idx].amount = parseInt(e.target.value);
                             setState({...state, milestones: newM});
                           }}
                           className="w-full accent-[#990000] h-1 bg-neutral-100 rounded-full appearance-none" 
                         />
                         <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Target Corpus</p>
                      </div>
                      <div className="space-y-2">
                         <span className="text-xl font-black text-neutral-900">{m.targetYear}</span>
                         <input 
                           type="range" min={new Date().getFullYear()} max={new Date().getFullYear() + (state.retirementAge - state.currentAge)} step={1} 
                           value={m.targetYear} 
                           onChange={e => {
                             const newM = [...state.milestones];
                             newM[idx].targetYear = parseInt(e.target.value);
                             setState({...state, milestones: newM});
                           }}
                           className="w-full accent-neutral-900 h-1 bg-neutral-100 rounded-full appearance-none" 
                         />
                         <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Target Year</p>
                      </div>
                   </div>
                </div>
              ))}
           </div>
           <button 
             onClick={() => setState({...state, milestones: [...state.milestones, { id: Date.now(), name: 'New Goal', amount: 1000000, targetYear: new Date().getFullYear() + 5 }]})}
             className="w-full py-6 border-2 border-dashed border-neutral-200 rounded-3xl text-neutral-400 font-bold text-xs uppercase tracking-widest hover:border-[#990000] hover:text-[#990000] transition-all"
           >
             + Add Another Life Discovery
           </button>
        </div>
      );
    case 6:
      return (
        <div className="space-y-8">
           <div className="flex justify-between items-end border-b border-neutral-100 pb-4">
              <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-1">Risk Protection Strategy</span>
                 <span className="text-2xl font-black text-indigo-600 tracking-tighter">Automated Glide-Path</span>
              </div>
           </div>
           <p className="text-sm font-medium text-neutral-500 leading-relaxed">
             We will start you with high risk (<b>{state.equity}% Equity</b>) today, but as you approach age {state.retirementAge}, we'll automatically shift your wealth into safer bonds to protect your gains.
           </p>
           <div className="h-24 w-full bg-neutral-50 rounded-3xl relative overflow-hidden flex items-center px-10">
              <div className="absolute left-0 top-0 h-full bg-[#990000]/10 transition-all" style={{ width: '100%' }} />
              <div className="flex-1 flex justify-between relative z-10">
                 <div className="text-center"><p className="text-[10px] font-bold text-neutral-400">NOW</p><p className="font-black text-indigo-600">80% Risk</p></div>
                 <div className="flex-1 border-t border-dashed border-neutral-300 mx-10 self-center" />
                 <div className="text-center"><p className="text-[10px] font-bold text-neutral-400">RETIRE</p><p className="font-black text-emerald-600">30% Risk</p></div>
              </div>
           </div>
        </div>
      );
    case 7:
      return (
        <div className="space-y-10">
           <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Withdrawal Rate Selection</p>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[3.0, 3.5, 4.0, 4.5].map(v => (
                <button 
                  key={v}
                  onClick={() => setState({...state, wr: v})}
                  className={`p-8 rounded-[2.5rem] border text-left transition-all ${state.wr === v ? 'bg-[#990000] text-white border-[#990000] shadow-2xl scale-[1.02]' : 'bg-white text-neutral-400 border-neutral-100 hover:border-indigo-100'}`}
                >
                   <p className="text-2xl font-black mb-1">{v}%</p>
                   <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                     {v === 3.0 ? 'Indestructible' : v === 3.5 ? 'Conservative' : v === 4.0 ? 'Standard Rule' : 'Risk Seeking'}
                   </p>
                </button>
              ))}
           </div>
        </div>
      );
    case 8:
      return (
        <div className="space-y-10">
           <p className="text-sm font-medium text-neutral-500 italic">"Most Indian retirees maintain 18-24 months of liquidity in FDs to weather equity storms."</p>
           <div className="flex gap-4">
              {[0, 1, 2, 3].map(v => (
                <button 
                  key={v}
                  onClick={() => setState({...state, cushionYears: v})}
                  className={`flex-1 p-8 rounded-3xl border transition-all ${state.cushionYears === v ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl' : 'bg-white text-neutral-400 border-neutral-100'}`}
                >
                   <p className="text-2xl font-black mb-1">{v}y</p>
                   <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Buffer</p>
                </button>
              ))}
           </div>
        </div>
      );
    case 9:
      return (
        <div className="flex flex-col items-center justify-center text-center space-y-10">
           <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
           </div>
           <div className="space-y-4">
              <h2 className="text-4xl font-black text-neutral-900 tracking-tighter">Your Financial Orbit is Mapped.</h2>
              <p className="text-neutral-500 text-lg max-w-sm mx-auto">We've factored in your {state.milestones.filter((m:any) => m.amount > 0).length} milestones and a defensive glide-path.</p>
           </div>
        </div>
      );
    default: return null;
  }
}
