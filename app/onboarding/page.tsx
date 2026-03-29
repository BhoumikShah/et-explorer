"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
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

const STEPS_TOTAL = 11;

const formatCurrency = (n: number) => {
   if (n >= 10000000) return "₹" + (n / 10000000).toLocaleString("en-IN", { maximumFractionDigits: 2 }) + " Cr";
   if (n >= 100000) return "₹" + (n / 100000).toLocaleString("en-IN", { maximumFractionDigits: 2 }) + "L";
   return "₹" + Math.round(n).toLocaleString("en-IN");
};

const formatIndian = (n: number) => {
   return n.toLocaleString('en-IN', {
      maximumFractionDigits: 0,
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
   });
};

const formatIndianNumber = (n: number) => {
   return n.toLocaleString('en-IN');
};

const parseIndianNumber = (s: string) => {
   return parseInt(s.replace(/,/g, '')) || 0;
};

function NumericInput({ value, onChange, className, ...props }: any) {
   const displayValue = formatIndianNumber(value || 0);
   return (
      <input
         type="text"
         value={displayValue === "0" ? "" : displayValue}
         onChange={(e) => {
            const rawValue = parseIndianNumber(e.target.value);
            onChange(rawValue);
         }}
         className={`${className} !text-black font-black placeholder:text-black placeholder:opacity-40 placeholder:font-black`}
         {...props}
      />
   );
}

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
      ],
      propertyValue: 10000000,
      homeDownpaymentPercent: 20,
      homeLoanOutstanding: 8000000,
      homeLoanEMI: 65000,
      homeLoanTenure: 20,
      homeLoanInterestRate: 8.5,
      homeOwnershipType: 'self_occupied',
      healthSumInsured: 500000,
      healthPremium: 10000,
      healthFamilyMembers: 1,
      healthIncludesParents: false,
      healthCityTier: 'tier1',
      monthlyIncome: 150000,
      lastChangedField: '' as 'emi' | 'tenure' | 'outstanding' | 'rate' | 'principal' | 'percent' | '',
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

   // Auto-calculate Loan Parameters
   useEffect(() => {
      const { propertyValue: PV, homeDownpaymentPercent: DPP, homeLoanOutstanding: P, homeLoanEMI: EMI, homeLoanTenure: N, homeLoanInterestRate: R, lastChangedField } = state;
      
      // 1. Calculate Loan Amount from Principal/Percentage
      const downpaymentVal = (PV * DPP) / 100;

      if (lastChangedField === 'principal' || lastChangedField === 'percent') {
         const newOutstanding = Math.max(0, PV - downpaymentVal);
         if (newOutstanding !== P) {
            setState(prev => ({ 
               ...prev, 
               homeLoanOutstanding: newOutstanding, 
               lastChangedField: 'outstanding' // Trigger EMI recalc
            }));
            return;
         }
      }

      const monthlyRate = (R / 100) / 12;
      if (P <= 0 || R <= 0) return;

      if (lastChangedField === 'tenure' || (lastChangedField === 'outstanding' && N > 0)) {
         // Calculate EMI: [P * r * (1+r)^n] / [(1+r)^n - 1]
         const months = N * 12;
         const emi = (P * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
         if (isFinite(emi) && Math.round(emi) !== EMI) {
            setState(prev => ({ ...prev, homeLoanEMI: Math.round(emi), lastChangedField: '' }));
         }
      } else if (lastChangedField === 'emi') {
         // Calculate Tenure: n = log[EMI / (EMI - P*r)] / log(1+r)
         if (EMI > P * monthlyRate) {
            const months = Math.log(EMI / (EMI - P * monthlyRate)) / Math.log(1 + monthlyRate);
            const years = Math.round((months / 12) * 10) / 10;
            if (isFinite(years) && years !== N) {
               setState(prev => ({ ...prev, homeLoanTenure: years, lastChangedField: '' }));
            }
         }
      }
   }, [state.propertyValue, state.homeDownpaymentPercent, state.homeLoanOutstanding, state.homeLoanEMI, state.homeLoanTenure, state.homeLoanInterestRate, state.lastChangedField]);

   const yearsToRetire = state.retirementAge - state.currentAge;
   const duration = 105 - state.retirementAge;
   const fireTarget = (state.monthly * state.expenseMultiplier * 12) / (state.wr / 100);
   const totalTarget = fireTarget + (state.monthly * state.expenseMultiplier * 12 * state.cushionYears);


   const nextStep = async () => {
      // special logic for downpayment goals
      if (currentStep === 2 && state.homeDownpaymentPercent === 0 && state.propertyValue > 0) {
         const hasGoal = state.milestones.some(m => m.name.toLowerCase().includes('house') || m.name.toLowerCase().includes('home'));
         if (!hasGoal) {
            setState(prev => ({
               ...prev,
               milestones: [
                  ...prev.milestones,
                  { id: Date.now(), name: 'House Downpayment', amount: state.propertyValue * 0.2, targetYear: new Date().getFullYear() + 5 }
               ]
            }));
         }
      }

      if (currentStep < STEPS_TOTAL) {
         setCurrentStep((s: number) => s + 1);
      } else {
         setLoading(true);
         try {
            console.log("Mapping final state to profile...");
            
            // Map to DB Schema
            const fullProfile = {
               personal: {
                  age: state.currentAge,
                  retirement_age: state.retirementAge,
                  monthly_income: state.monthlyIncome,
                  monthly_expenses: state.monthly * state.expenseMultiplier,
                  current_savings: state.currentCorpus,
                  monthly_investment_budget: state.monthlySIP,
                  risk_tolerance: (state.equity > 60 ? "aggressive" : "moderate") as 'conservative' | 'moderate' | 'aggressive',
                  tax_regime: "new" as 'old' | 'new',
                  property_value: state.propertyValue,
                  home_loan_outstanding: state.homeLoanOutstanding,
                  home_loan_emi: state.homeLoanEMI,
                  home_loan_tenure_remaining: state.homeLoanTenure,
                  home_loan_interest_rate: state.homeLoanInterestRate,
                  home_ownership_type: state.homeOwnershipType
               },
               investments: [
                  { asset_class: "Equity", current_value: (state.currentCorpus * state.equity / 100), expected_return: 12 },
                  { asset_class: "Debt", current_value: (state.currentCorpus * (state.debt + state.cash) / 100), expected_return: 7 }
               ],
               goals: [
                  ...state.milestones.filter((m: any) => m.amount > 0).map((m: any) => ({ name: m.name, target_year: m.targetYear, target_amount: m.amount })),
                  { name: "FIRE", target_year: new Date().getFullYear() + yearsToRetire, target_amount: totalTarget }
               ],
               insurance: { life_coverage: (state.monthly * 12 * 10), health_coverage: state.healthSumInsured },
               health_insurance: {
                  sum_insured: state.healthSumInsured,
                  annual_premium: state.healthPremium,
                  family_members_covered: state.healthFamilyMembers,
                  includes_parents: state.healthIncludesParents,
                  city_tier: state.healthCityTier
               },
               fire_preferences: { swr: state.wr, fire_type: "regular", strategy: "fixed", glide_path: true }
            };

            if (user?.id) {
               await saveFullProfile(user.id, fullProfile);
               console.log("Profile successfully persisted to DB");
            }

            // Fallback for local testing without Supabase configured
            try {
               localStorage.setItem('et_explorer_profile', JSON.stringify({ ...fullProfile, id: user?.id || 'local-user' }));
            } catch (e) {
               console.error("Local storage save failed:", e);
            }
            
            router.push("/dashboard");
         } catch (err) {
            console.error("Discovery save failed, but moving forward:", err);
            router.push("/dashboard");
         }
      }
   };
   return (
      <div className="min-h-screen bg-white flex flex-col selection:bg-[#990000] selection:text-white">
         {/* Header */}
         <header className="bg-white border-b border-neutral-950 sticky top-0 z-[100] shadow-sm shrink-0">
            <div className="max-w-[1400px] mx-auto px-6 py-5 flex items-center justify-between">
               <div className="flex items-center gap-10">
                  <Link href="/" className="flex items-center gap-4 group">
                     <div className="w-10 h-10 bg-[#990000] rounded-lg flex items-center justify-center text-white font-serif italic text-xl font-black shadow-lg shadow-red-200 group-hover:scale-105 transition-transform">
                        ET
                     </div>
                     <h1 className="text-2xl font-black tracking-tighter text-black font-serif lowercase italic">explorer</h1>
                  </Link>

                  <div className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-black">
                     <Link href="/" className="hover:text-[#990000] transition-colors">Home</Link>
                     <Link href="/dashboard" className="text-[#990000]">Dashboard</Link>
                  </div>
               </div>
               <Link
                  href="/dashboard"
                  className="text-[10px] font-bold uppercase tracking-widest text-black hover:text-black transition-colors"
               >
                  Skip to Dashboard
               </Link>
            </div>
         </header>

         <div className="flex-1 flex flex-col md:flex-row max-w-[1400px] w-full mx-auto overflow-hidden">

            {/* Sidebar - Visible from Step 1 */}
            <div className="hidden md:flex w-[380px] bg-white border-r border-neutral-950 p-10 flex-col gap-10 sticky top-0 h-screen overflow-y-auto">
               <div>
                  <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-black font-black mb-8 border-b-4 border-black pb-2">Snapshot Report</h2>
                  <div className="space-y-6">
                     <div className="border-b border-black pb-4">
                        <p className="text-[10px] uppercase font-bold text-black mb-1">Target Corpus</p>
                        <p className="text-2xl font-black text-[#990000] tracking-tight">{formatCurrency(totalTarget)}</p>
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <div>
                           <p className="text-[10px] uppercase font-bold text-black mb-1">Retire At</p>
                           <p className="text-lg font-bold text-black">Age {state.retirementAge}</p>
                        </div>
                        <div>
                           <p className="text-[10px] uppercase font-bold text-black mb-1">Safe Rate</p>
                           <p className="text-lg font-bold text-black">{state.wr}%</p>
                        </div>
                     </div>
                     <div className="space-y-4">
                        <div>
                           <div className="flex justify-between items-center text-[10px] font-bold uppercase text-black mb-2">
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

               <div className="mt-auto bg-white rounded-3xl p-6 border-2 border-black italic text-black text-xs leading-relaxed shadow-lg">
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
                           <p className="text-black text-lg leading-relaxed font-medium">
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
                  <div className="mt-20 pt-10 border-t border-black flex items-center justify-between">
                        <button
                        onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
                        className={`text-black font-bold text-xs uppercase tracking-widest hover:text-[#990000] transition-colors ${currentStep === 1 ? 'invisible' : ''}`}
                     >
                        ← Go Back
                     </button>
                     <button
                        onClick={nextStep}
                        disabled={loading || (currentStep === 7 && state.monthlyIncome < (state.monthly + state.homeLoanEMI + Math.round(state.healthPremium / 12) + state.monthlySIP))}
                        className="bg-[#990000] text-white px-10 py-5 rounded-2xl font-bold tracking-widest text-xs uppercase hover:bg-black transition-all shadow-lg shadow-red-100 disabled:opacity-50"
                     >
                        {currentStep === STEPS_TOTAL ? (loading ? 'Saving Orbit...' : 'Finish Explorer') : 'Continue Discovery'}
                     </button>
                  </div>
               </main>
            </div>

            {/* Mobile Sticky Bar */}
            <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-neutral-950 p-4 flex justify-between items-center z-50">
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-black uppercase">FIRE Target</span>
                  <span className="text-lg font-black text-[#990000]">{formatCurrency(totalTarget)}</span>
               </div>
               <div className="flex flex-col text-right">
                  <span className="text-[10px] font-bold text-black uppercase">On Track</span>
                  <span className="text-lg font-black text-[#990000]">8%</span>
               </div>
            </div>
         </div>
      </div>
   );
}

function getExplanation(step: number, state: any) {
   switch (step) {
      case 1: return "First things first — how much do you actually spend each month? Include everything from rent to bills. If you're not sure, look at your monthly savings vs your salary.";
      case 2: return "Do you have a home mortgage? Owning a home is both an asset and a liability. We'll factor in your EMI and outstanding balance to see when you'll be debt-free.";
      case 3: return "Retirement duration is the single biggest factor in your FIRE number. A longer runway means we need to be more conservative with your withdrawal rates.";
      case 4: return "You're probably not starting from zero. Mutual funds, EPF, savings—all of it counts. We calculate how this amount grows by the time you stop working.";
      case 5: return "Where you put your money matters. As you grow older, you should gradually shift from risky stocks to stable bonds. This is called a 'Glide Path'.";
      case 6: return "Medical expenses can be the biggest threat to retirement. Tell us about your current health cover so we can ensure you're fully protected against inflation.";
      case 7: return "Now — how much can you set aside every month? This is your SIP amount. We'll also factor in if you expect your income to grow over time.";
      case 8: return "Life isn't just about retiring. You might want to buy a house or fund a child's education. These 'lumpy' expenses can derail a plan if not factored in early.";
      case 9: return "Inflation is the sneaky enemy. India averages around 6% historically. We've suggested a withdrawal rate based on your planned retirement duration.";
      case 10: return "A safety buffer prevents selling stocks during a market crash. We suggest keeping 1-2 years of expenses in cash or FDs separate from investments.";
      case 11: return "We've finished our discovery. We can now project exactly when you reach orbit and what your financial roadmap looks like.";
      default: return "";
   }
}

function renderStepInput(step: number, state: any, setState: any) {

   switch (step) {
      case 1:
         return (
            <div className="space-y-8">
               <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase text-black tracking-widest">Monthly Expenses</span>
                  <span className="text-4xl font-black text-[#990000] tracking-tighter">{formatCurrency(state.monthly)}</span>
               </div>
               <div className="relative group">
                  <div className="absolute -top-12 right-0 bg-black text-white px-3 py-1 rounded-lg text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity">
                     {formatIndianNumber(state.monthly)}
                  </div>
                  <input type="range" min={10000} max={500000} step={5000} value={state.monthly} onChange={(e: ChangeEvent<HTMLInputElement>) => setState({ ...state, monthly: parseInt(e.target.value) })} className="w-full accent-[#990000] h-2 bg-neutral-900 rounded-full appearance-none cursor-pointer" />
               </div>
               <NumericInput 
                  value={state.monthly} 
                  onChange={(val: number) => setState({ ...state, monthly: val })} 
                  className="w-full p-6 text-3xl font-black bg-white border-2 border-black rounded-3xl outline-none"
                  placeholder="Enter expenses..."
               />
               <div className="flex gap-4">
                  {[0.85, 1.0, 1.15].map(v => (
                     <button
                        key={v}
                        onClick={() => setState({ ...state, expenseMultiplier: v })}
                        className={`flex-1 p-5 rounded-2xl border-2 transition-all text-xs font-black tracking-widest ${state.expenseMultiplier === v ? 'bg-[#990000] text-white border-black shadow-2xl scale-105' : 'bg-white text-black border-black hover:bg-white'}`}
                     >
                        {v === 0.85 ? 'Less (Lean)' : v === 1.0 ? 'Default' : 'More (Fat)'}
                     </button>
                  ))}
               </div>
            </div>
         );
      case 2:
         return (
            <div className="space-y-8">
               <div className="space-y-8">
                  {/* Primary Inputs: Price & DP Percentage */}
                  <div className="bg-white border-2 border-black p-8 rounded-[2.5rem] shadow-xl space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <p className="text-[10px] uppercase font-black text-black tracking-widest flex justify-between">
                              House Price
                              <span className="text-[#990000]">{formatCurrency(state.propertyValue)}</span>
                           </p>
                           <div className="flex gap-2">
                              <NumericInput 
                                 value={state.propertyValue} 
                                 onChange={(val: number) => setState({ ...state, propertyValue: val, lastChangedField: 'principal' })} 
                                 className="flex-1 p-5 font-black text-xl bg-white border-2 border-black rounded-2xl outline-none focus:ring-4 focus:ring-red-100 transition-all shadow-sm"
                              />
                              <button onClick={() => setState({ ...state, propertyValue: state.propertyValue + 500000, lastChangedField: 'principal' })} className="px-4 bg-[#990000] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">+5L</button>
                           </div>
                        </div>
                        <div className="space-y-3">
                           <p className="text-[10px] uppercase font-black text-black tracking-widest flex justify-between">
                              Downpayment %
                              <span className={state.homeDownpaymentPercent < 20 ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
                                 {state.homeDownpaymentPercent === 0 ? "Plan to Buy?" : state.homeDownpaymentPercent + "%"}
                              </span>
                           </p>
                           <div className="flex gap-2">
                              <input 
                                 type="text" 
                                 value={state.homeDownpaymentPercent === 0 ? "" : state.homeDownpaymentPercent} 
                                 onChange={(e: ChangeEvent<HTMLInputElement>) => setState({ ...state, homeDownpaymentPercent: parseInt(e.target.value.replace(/\D/g, '')) || 0, lastChangedField: 'percent' })} 
                                 className="flex-1 p-5 font-black text-xl bg-white border-2 border-black rounded-2xl outline-none focus:ring-4 focus:ring-red-100 transition-all shadow-sm !text-black !opacity-100" 
                              />
                              <button onClick={() => setState({ ...state, homeDownpaymentPercent: 20, lastChangedField: 'percent' })} className="px-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">Min 20%</button>
                           </div>
                           <p className="text-[9px] font-bold text-black uppercase tracking-wider">Note: Minimum 20% is recommended to avoid high interest.</p>
                        </div>
                     </div>
                  </div>

                  {/* Calculated Result: Loan */}
                  <div className="flex items-center gap-6 p-6 bg-white rounded-3xl border-4 border-emerald-500 shadow-xl">
                     <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <TrendingUp size={24} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase text-emerald-800 tracking-widest mb-1">Calculated Loan (Principal)</p>
                        <p className="text-3xl font-black text-emerald-950 tracking-tighter">{formatIndian(state.homeLoanOutstanding)}</p>
                     </div>
                  </div>

                  {/* Secondary Inputs: Tenure & EMI */}
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <p className="text-[10px] uppercase font-black text-black tracking-widest">Interest Rate (%)</p>
                        <input 
                           type="text" 
                           value={state.homeLoanInterestRate || ""} 
                           onChange={(e: ChangeEvent<HTMLInputElement>) => setState({ ...state, homeLoanInterestRate: parseFloat(e.target.value) || 0, lastChangedField: 'rate' })} 
                           className="w-full p-4 font-black bg-white border-2 border-black rounded-2xl outline-none focus:ring-4 focus:ring-red-100 transition-all !text-black !opacity-100" 
                        />
                     </div>
                     <div className="space-y-2">
                        <p className="text-[10px] uppercase font-black text-black tracking-widest flex justify-between">
                           Tenure (Years)
                           {state.lastChangedField === 'emi' && <span className="text-[8px] text-[#990000] animate-pulse font-black">AI UPDATED</span>}
                        </p>
                        <input 
                           type="text" 
                           value={state.homeLoanTenure || ""} 
                           onChange={(e: ChangeEvent<HTMLInputElement>) => setState({ ...state, homeLoanTenure: parseFloat(e.target.value) || 0, lastChangedField: 'tenure' })} 
                           className="w-full p-4 font-black bg-white border-2 border-black rounded-2xl outline-none focus:ring-4 focus:ring-red-100 transition-all !text-black !opacity-100" 
                        />
                     </div>
                     <div className="col-span-2 space-y-2">
                        <p className="text-[10px] uppercase font-black text-black tracking-widest flex justify-between">
                           Target Monthly EMI
                           {(state.lastChangedField === 'tenure' || state.lastChangedField === 'outstanding' || state.lastChangedField === 'principal' || state.lastChangedField === 'percent') && <span className="text-[8px] text-[#990000] animate-pulse font-black">AI UPDATED</span>}
                        </p>
                        <NumericInput 
                           value={state.homeLoanEMI} 
                           onChange={(val: number) => setState({ ...state, homeLoanEMI: val, lastChangedField: 'emi' })} 
                           className="w-full p-6 text-3xl font-black bg-white border-2 border-[#990000] rounded-3xl outline-none focus:ring-4 focus:ring-red-50 transition-all text-[#990000] shadow-sm"
                        />
                     </div>
                  </div>
               </div>
               
               <div className="flex gap-4">
                  {['self_occupied', 'rented'].map(v => (
                     <button key={v} onClick={() => setState({ ...state, homeOwnershipType: v })} className={`flex-1 p-5 rounded-2xl border-2 text-xs font-black tracking-widest transition-all ${state.homeOwnershipType === v ? 'bg-neutral-950 text-white border-neutral-950 shadow-2xl scale-105' : 'bg-white text-black font-black border-neutral-950 hover:border-neutral-400'}`}>
                        {v.replace('_', ' ').toUpperCase()}
                     </button>
                  ))}
               </div>
            </div>
         );
      case 3:
         return (
            <div className="space-y-10">
               <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-2">
                     <p className="text-[10px] uppercase font-black text-black tracking-widest">Current Age</p>
                     <input type="number"
                        value={state.currentAge}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setState({ ...state, currentAge: parseInt(e.target.value) || 0 })}
                        className="w-full p-6 text-3xl font-black bg-white border-2 border-black rounded-3xl outline-none focus:ring-4 focus:ring-red-100 transition-all !text-black !opacity-100"
                     />
                  </div>
                  <div className="space-y-2">
                     <p className="text-[10px] uppercase font-black text-black tracking-widest">Retirement Age</p>
                     <input type="number"
                        value={state.retirementAge}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setState({ ...state, retirementAge: parseInt(e.target.value) || 0 })}
                        className="w-full p-6 text-3xl font-black bg-white border-2 border-black rounded-3xl outline-none focus:ring-4 focus:ring-red-100 transition-all !text-black !opacity-100"
                     />
                  </div>
               </div>
            </div>
         );
      case 4:
         return (
            <div className="space-y-10">
               <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-end">
                     <span className="text-[10px] font-black uppercase text-black tracking-widest">Current Net Worth (Investments)</span>
                     <span className="text-4xl font-black text-[#990000] tracking-tighter">{formatCurrency(state.currentCorpus)}</span>
                  </div>
                  <input type="range" min={0} max={50000000} step={100000} value={state.currentCorpus} onChange={(e: ChangeEvent<HTMLInputElement>) => setState({ ...state, currentCorpus: parseInt(e.target.value) })} className="w-full accent-[#990000] h-2 bg-neutral-900 rounded-full appearance-none cursor-pointer" />
                  <NumericInput 
                     value={state.currentCorpus} 
                     onChange={(val: number) => setState({ ...state, currentCorpus: val })} 
                     className="w-full p-8 text-4xl font-black bg-white border-2 border-black rounded-[2.5rem] outline-none text-[#990000] shadow-xl"
                  />
                  <div className="flex gap-2">
                     {[100000, 500000, 1000000].map(val => (
                        <button key={val} onClick={() => setState({ ...state, currentCorpus: state.currentCorpus + val })} className="flex-1 p-3 bg-white border-2 border-black rounded-xl text-[10px] font-black hover:bg-[#990000] hover:text-white transition-all shadow-md">
                           +{val / 100000}L
                        </button>
                     ))}
                  </div>
               </div>
            </div>
         );
      case 5:
         return (
            <div className="space-y-8">
               <div className="flex justify-between items-end border-b border-black pb-4">
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black uppercase text-black tracking-widest mb-1">Risk Protection Strategy</span>
                     <span className="text-2xl font-black text-[#990000] tracking-tighter">Automated Glide-Path</span>
                  </div>
               </div>
               <div className="h-24 w-full bg-white rounded-3xl relative overflow-hidden flex items-center px-10">
                  <div className="absolute left-0 top-0 h-full bg-[#990000]/10 transition-all" style={{ width: '100%' }} />
                  <div className="flex-1 flex justify-between relative z-10">
                     <div className="text-center"><p className="text-[10px] font-bold text-black">NOW</p><p className="font-black text-[#990000]">80% Risk</p></div>
                     <div className="flex-1 border-t border-dashed border-black border-2 opacity-100 mx-10 self-center" />
                     <div className="text-center"><p className="text-[10px] font-bold text-black">RETIRE</p><p className="font-black text-emerald-600">30% Risk</p></div>
                  </div>
               </div>
            </div>
         );
      case 6: {
          const calculatedPremium = Math.round(state.healthSumInsured * 0.008 * (1 + (state.healthFamilyMembers - 1) * 0.4));
          return (
             <div className="space-y-10">
                <div className="bg-white border-2 border-black p-8 rounded-[3rem] shadow-xl space-y-10">
                   <div className="space-y-4">
                      <p className="text-[10px] uppercase font-black text-black tracking-widest flex justify-between items-center">
                         Target Health Cover (Sum Insured)
                         <span className="text-[#990000] text-xl font-black">{formatCurrency(state.healthSumInsured)}</span>
                      </p>
                      <div className="flex gap-4">
                         <NumericInput 
                            value={state.healthSumInsured} 
                            onChange={(val: number) => setState({ ...state, healthSumInsured: val, healthPremium: Math.round(val * 0.008 * (1 + (state.healthFamilyMembers - 1) * 0.4)) })} 
                            className="flex-1 p-6 font-black text-2xl bg-white border-2 border-black rounded-2xl outline-none focus:ring-4 focus:ring-red-100 shadow-sm !text-black !opacity-100"
                         />
                         <div className="flex flex-col gap-2">
                            <button onClick={() => {
                               const newVal = state.healthSumInsured + 100000;
                               setState({ ...state, healthSumInsured: newVal, healthPremium: Math.round(newVal * 0.008 * (1 + (state.healthFamilyMembers - 1) * 0.4)) });
                            }} className="px-6 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-transform">+1L</button>
                            <button onClick={() => {
                               const newVal = state.healthSumInsured + 500000;
                               setState({ ...state, healthSumInsured: newVal, healthPremium: Math.round(newVal * 0.008 * (1 + (state.healthFamilyMembers - 1) * 0.4)) });
                            }} className="px-6 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-transform">+5L</button>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <p className="text-[10px] uppercase font-black text-black tracking-widest">Total Family Members Covered</p>
                      <div className="flex gap-4">
                        {[1, 2, 3, 4, 5].map(num => (
                           <button 
                              key={num} 
                              onClick={() => {
                                 setState({ ...state, healthFamilyMembers: num, healthPremium: Math.round(state.healthSumInsured * 0.008 * (1 + (num - 1) * 0.4)) });
                              }}
                              className={`flex-1 p-6 rounded-2xl border-2 font-black text-xl transition-all ${state.healthFamilyMembers === num ? 'bg-[#990000] text-white border-black scale-105 shadow-xl' : 'bg-white text-black border-black hover:bg-red-50'}`}
                           >
                              {num}
                           </button>
                        ))}
                      </div>
                   </div>

                   <div className="pt-8 border-t-2 border-dashed border-black">
                      <div className="flex items-center justify-between p-8 bg-emerald-50 rounded-[2rem] border-2 border-emerald-500 shadow-inner">
                         <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-emerald-800 tracking-[0.2em]">Estimated Annual Premium</p>
                            <p className="text-sm font-bold text-emerald-700">Calculated based on standard family-floater rules</p>
                         </div>
                         <div className="text-right">
                            <span className="text-3xl font-black text-emerald-600 tracking-tighter">{formatCurrency(calculatedPremium)}</span>
                            <p className="text-[9px] font-black uppercase text-emerald-600 mt-1">AI ESTIMATED</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          );
       }
      case 7: {
         const totalOutflows = state.monthly + state.homeLoanEMI + Math.round(state.healthPremium / 12) + state.monthlySIP;
         const isDeficit = state.monthlyIncome < totalOutflows;
         
         return (
            <div className="space-y-10">
               <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-end">
                     <span className="text-[10px] font-black uppercase text-black tracking-widest">Monthly Take-Home Income</span>
                     <span className="text-4xl font-black text-blue-600 tracking-tighter">{formatCurrency(state.monthlyIncome)}</span>
                  </div>
                  <input type="range" min={10000} max={1000000} step={5000} value={state.monthlyIncome} onChange={(e: ChangeEvent<HTMLInputElement>) => setState({ ...state, monthlyIncome: parseInt(e.target.value) })} className="w-full accent-blue-600 h-2 bg-neutral-900 rounded-full appearance-none cursor-pointer shadow-inner" />
               </div>
               <div className="flex flex-col gap-6 pt-6 border-t border-black">
                  <div className="flex justify-between items-end">
                     <span className="text-[10px] font-black uppercase text-black tracking-widest">Monthly Investment (SIP)</span>
                     <span className="text-4xl font-black text-emerald-600 tracking-tighter">{formatCurrency(state.monthlySIP)}</span>
                  </div>
                  <input type="range" min={1000} max={200000} step={1000} value={state.monthlySIP} onChange={(e: ChangeEvent<HTMLInputElement>) => setState({ ...state, monthlySIP: parseInt(e.target.value) })} className="w-full accent-emerald-600 h-2 bg-neutral-900 rounded-full appearance-none cursor-pointer shadow-inner" />
                  <div className="flex gap-2">
                     {[10000, 25000, 50000].map(val => (
                        <button key={val} onClick={() => setState({ ...state, monthlySIP: state.monthlySIP + val })} className="flex-1 p-4 bg-white border-2 border-black rounded-2xl text-[10px] font-black hover:bg-emerald-600 hover:text-white transition-all shadow-md">
                           +{val >= 100000 ? (val / 100000) + 'L' : (val / 1000) + 'K'}
                        </button>
                     ))}
                  </div>
               </div>
               
               <div className={`p-6 rounded-2xl border-2 transition-all shadow-lg ${isDeficit ? 'bg-red-50 border-red-500' : 'bg-emerald-50 border-emerald-500'}`}>
                  <div className="flex justify-between items-center mb-4 border-b border-black/10 pb-2">
                     <span className={`text-[10px] font-black uppercase tracking-widest ${isDeficit ? 'text-red-700' : 'text-emerald-700'}`}>Budget Check</span>
                     <span className={`text-sm font-black uppercase tracking-widest ${isDeficit ? 'text-red-600' : 'text-emerald-600'}`}>{isDeficit ? 'Deficit Detected' : 'Healthy Surplus'}</span>
                  </div>
                  <div className="space-y-3">
                     <div className="flex justify-between items-center text-sm font-black text-black">
                        <span>Total Income</span>
                        <span>{formatCurrency(state.monthlyIncome)}</span>
                     </div>
                     <div className="flex justify-between items-center text-xs font-bold text-black opacity-80 pl-4 border-l-2 border-black/20">
                        <span>Living Expenses</span>
                        <span>-{formatCurrency(state.monthly)}</span>
                     </div>
                     {state.homeLoanEMI > 0 && (
                        <div className="flex justify-between items-center text-xs font-bold text-black opacity-80 pl-4 border-l-2 border-black/20">
                           <span>Home Loan EMI</span>
                           <span>-{formatCurrency(state.homeLoanEMI)}</span>
                        </div>
                     )}
                     <div className="flex justify-between items-center text-xs font-bold text-black opacity-80 pl-4 border-l-2 border-black/20">
                        <span>Insurance (Monthly Avg)</span>
                        <span>-{formatCurrency(Math.round(state.healthPremium / 12))}</span>
                     </div>
                     <div className="flex justify-between items-center text-xs font-bold text-black opacity-80 pl-4 border-l-2 border-black/20">
                        <span>Investments (SIP)</span>
                        <span>-{formatCurrency(state.monthlySIP)}</span>
                     </div>
                     <div className="flex justify-between items-center text-lg font-black pt-2 mt-2 border-t-2 border-black/10">
                        <span className={isDeficit ? 'text-red-600' : 'text-emerald-600'}>Remaining Cash</span>
                        <span className={isDeficit ? 'text-red-600' : 'text-emerald-600'}>
                           {formatCurrency(state.monthlyIncome - totalOutflows)}
                        </span>
                     </div>
                  </div>
               </div>
            </div>
         );
      }
      case 8:
         return (
            <div className="space-y-8">
               {state.milestones.map((m: any, idx: number) => (
                  <div key={m.id} className="p-8 bg-white border-2 border-black rounded-[2rem] space-y-6 shadow-xl">
                     <p className="text-[10px] font-black uppercase text-black tracking-[0.2em]">Milestone Name</p>
                     <input className="font-black text-xl bg-white p-4 rounded-xl outline-none w-full border-2 border-black focus:bg-white transition-all" value={m.name} onChange={(e: ChangeEvent<HTMLInputElement>) => { const nm = [...state.milestones]; nm[idx].name = e.target.value; setState({ ...state, milestones: nm }); }} />
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <p className="text-[10px] font-black uppercase text-black">Target Amount (₹)</p>
                           <NumericInput 
                              value={m.amount} 
                              onChange={(val: number) => { const nm = [...state.milestones]; nm[idx].amount = val; setState({ ...state, milestones: nm }); }} 
                              className="p-4 font-black bg-white border-2 border-black rounded-xl w-full focus:ring-4 focus:ring-red-50" 
                           />
                        </div>
                        <div className="space-y-2">
                           <p className="text-[10px] font-black uppercase text-black">Target Year</p>
                           <input 
                              type="number" 
                              value={m.targetYear} 
                              onChange={(e: ChangeEvent<HTMLInputElement>) => { const nm = [...state.milestones]; nm[idx].targetYear = parseInt(e.target.value); setState({ ...state, milestones: nm }); }} 
                              className="p-4 font-black bg-white border-2 border-black rounded-xl w-full !text-black !opacity-100" 
                           />
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         );
      case 9:
         return (
            <div className="space-y-10">
               <div className="grid grid-cols-2 gap-6">
                  {[3.0, 3.5, 4.0, 4.5].map(v => (
                     <button key={v} onClick={() => setState({ ...state, wr: v })} className={`p-8 rounded-3xl border ${state.wr === v ? 'bg-[#990000] text-white' : 'bg-white'}`}>
                        <p className="text-2xl font-black">{v}%</p>
                     </button>
                  ))}
               </div>
            </div>
         );
      case 10:
         return (
            <div className="flex gap-4">
               {[0, 1, 2, 3].map(v => (
                  <button key={v} onClick={() => setState({ ...state, cushionYears: v })} className={`flex-1 p-8 rounded-3xl border ${state.cushionYears === v ? 'bg-emerald-600 text-white' : 'bg-white'}`}>
                     <p className="text-2xl font-black">{v}y</p>
                  </button>
               ))}
            </div>
         );
      case 11:
         return (
            <div className="text-center space-y-4">
               <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500" />
               <h2 className="text-3xl font-black">Plan Complete</h2>
            </div>
         );
      default: return null;
   }
}
