import { 
  computeIncomeTax, 
  compareTaxRegimes, 
  INDIAN_TAX_OLD_REGIME 
} from '../knowledgeBase/indianTax';
import { 
  DEFAULT_RETURNS, 
  INFLATION_RATE, 
  SAFE_WITHDRAWAL_RATE 
} from '../knowledgeBase/assetReturns';
import { calculateRequiredLifeCover, assessHealthCover } from '../knowledgeBase/insuranceRules';

/**
 * FIRE Types Mapping (Multipliers of Basic Expenses)
 */
export const FIRE_TYPES = {
  lean: 0.7,    // Minimalist (70% of current)
  regular: 1.0, // Standard (100% of current)
  fat: 1.5      // Extravagant (150% of current)
};

/**
 * Calculates current required emergency fund (6 months average expenses)
 */
export const calculateEmergencyFund = (monthlyExpenses: number, months = 6): number => {
  return monthlyExpenses * months;
};

/**
 * Calculates current monthly surplus for investments
 */
export const calculateMonthlySurplus = (
  income: number, 
  expenses: number, 
  emi: number = 0, 
  healthPremium: number = 0, 
  otherDeductions: number = 0
): number => {
  return Math.max(0, income - expenses - emi - (healthPremium / 12) - otherDeductions);
};

/**
 * Calculates net worth including home and mortgage
 */
export const calculateNetWorthWithMortgage = (
  investments: number, 
  propertyValue: number = 0, 
  loanOutstanding: number = 0
): number => {
  return (investments + propertyValue) - loanOutstanding;
};

/**
 * Project Loan Amortization
 */
export const projectLoanAmortization = (
  principal: number,
  annualRate: number,
  remainingYears: number,
  currentMonthlyEmi: number
): number[] => {
  const months = Math.ceil(remainingYears * 12);
  const monthlyRate = (annualRate / 100) / 12;
  const amortization = [];
  let balance = principal;

  for (let m = 0; m <= months; m++) {
    amortization.push(Math.max(0, balance));
    if (m === months) break;
    
    const interest = balance * monthlyRate;
    const principalPaid = currentMonthlyEmi - interest;
    balance -= principalPaid;
  }
  return amortization;
};

/**
 * Health Insurance Recommendation
 */
export const recommendHealthCover = (
  existingCover: number,
  familySize: number,
  age: number,
  cityTier: 'tier1' | 'tier2' | 'tier3' = 'tier1',
  medicalInflation: number = 0.10
) => {
  const location = cityTier === 'tier1' ? 'metro' : 'non-metro';
  const assessment = assessHealthCover(existingCover, familySize, location);
  
  // Basic recommendation: ₹5L for individual, ₹10L for family of 4
  const minRecommended = familySize > 1 ? 1000000 : 500000;
  const recommendedCover = Math.max(assessment.suggestedCover, minRecommended);
  
  const gap = Math.max(0, recommendedCover - existingCover);
  const topUpSuggestion = gap > 0 ? gap : 0;
  
  // Estimated premium for top-up (rough estimate: ₹1000 per 1L cover for family)
  const estimatedPremium = (topUpSuggestion / 100000) * 1500; 

  return {
    adequate: existingCover >= recommendedCover,
    recommendedCover,
    topUpSuggestion,
    estimatedPremium,
    medicalInflation
  };
};

/**
 * Future Value of SIP (Monthly Investment)
 */
export const calculateFV = (sip: number, months: number, annualRate: number) => {
  const r = annualRate / 12;
  if (r === 0) return sip * months;
  return sip * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
};

/**
 * Calculates SIP required to hit a target amount using compound interest formula.
 */
export const calculateSIP = (
  targetAmount: number, 
  years: number, 
  expectedReturn: number, 
  currentValue = 0
): number => {
  const months = years * 12;
  const r = expectedReturn / 12;

  const fvExisting = currentValue * Math.pow(1 + r, months);
  const remainingTarget = targetAmount - fvExisting;

  if (remainingTarget <= 0) return 0;
  if (r === 0) return remainingTarget / months;

  const sip = remainingTarget * r / ((Math.pow(1 + r, months) - 1) * (1 + r));
  return Math.ceil(sip);
};

/**
 * Equity allocation glide path based on age (Formula: retirementAge - age * 3)
 */
export const getGlidePath = (age: number, retirementAge: number): { age: number; equityPercentage: number }[] => {
  const path = [];
  for (let a = age; a <= retirementAge; a++) {
     // max(20, min(80, (retirementAge - currentAge) * 3))
     const diff = retirementAge - a;
     const equity = Math.max(20, Math.min(80, diff * 3));
     path.push({ age: a, equityPercentage: equity });
  }
  return path;
};

/**
 * Calculates the FIRE Corpus needed based on inflation-adjusted retirement expenses
 */
export const calculateFIRECorpus = (
  currentMonthlyExpenses: number,
  yearsToRetire: number,
  swr: number,
  fireTypeMultiplier: number = 1.0,
  inflationRate: number = INFLATION_RATE
) => {
  // 1. Inflate current expenses to the first year of retirement
  const futureMonthlyExpenses = currentMonthlyExpenses * Math.pow(1 + inflationRate, yearsToRetire) * fireTypeMultiplier;
  const annualRetirementExpenses = futureMonthlyExpenses * 12;

  // 2. Corpus needed = Annual Expenses / SWR
  const corpusNeeded = annualRetirementExpenses / swr;
  
  return {
    annualRetirementExpenses,
    corpusNeeded,
    futureMonthlyExpenses
  };
};

/**
 * Calculates CoastFI Number
 * Formula: CorpusNeeded / (1 + realReturn)^yearsToRetire
 */
export const calculateCoastFI = (
  fireCorpusNeeded: number,
  yearsToRetire: number,
  expectedReturn: number,
  inflationRate: number = INFLATION_RATE
) => {
  const realReturn = (1 + expectedReturn) / (1 + inflationRate) - 1;
  const coastFINumber = fireCorpusNeeded / Math.pow(1 + realReturn, yearsToRetire);
  return Math.ceil(coastFINumber);
};

/**
 * Projects net worth month-by-month with nominal and inflation-adjusted values
 */
export const calculateNetWorthProjection = (
  profile: any, 
  investments: any[], 
  goals: any[], 
  totalMonthlySIP: number,
  customParams?: any
): any[] => {
  const currentAge = Number(profile.age) || 30;
  const retirementAge = Number(customParams?.retirementAge || profile.retirement_age) || 60;
  
  // Ensure we always have at least 1 month projection
  const monthsToRetire = Math.max(1, (retirementAge - currentAge) * 12);

  const annualReturn = Number(customParams?.expectedReturn || 0.10);
  const inflationRate = Number(customParams?.inflationRate || INFLATION_RATE);
  
  // Investments total
  let runningInvestments = (investments || []).reduce((sum, inv) => sum + (Number(inv.current_value) || 0), 0);
  runningInvestments += (Number(profile.current_savings) || 0);

  // Mortgage details
  const loanPrincipal = Number(profile.home_loan_outstanding) || 0;
  const propertyValue = Number(profile.property_value) || 0;
  const loanRate = Number(profile.home_loan_interest_rate) || 7.5;
  const loanTenure = Number(profile.home_loan_tenure_remaining) || 0;
  const loanEmi = Number(profile.home_loan_emi) || 0;

  // Insurance details for sunk costs calculation
  const healthPremiumMonthly = (Number(profile.health_insurance?.[0]?.annual_premium) || 0) / 12;
  const lifePremiumMonthly = 0; // Simplified for now since life insurance premium isn't always tracked separately

  const loanAmortization = projectLoanAmortization(loanPrincipal, loanRate, loanTenure, loanEmi);
  
  const monthlyRate = annualReturn / 12;
  const monthlyInflation = inflationRate / 12;

  const projection = [];
  let cumulativeSunkCosts = 0;
  let hasPaidOffHome = false;
  let homePayoffAge: number | null = null;

  for (let m = 0; m <= monthsToRetire; m++) {
    const age = currentAge + (m / 12);
    const year = new Date().getFullYear() + Math.floor(m / 12);
    
    if (m > 0) {
      runningInvestments += (Number(totalMonthlySIP) || 0);
      runningInvestments *= (1 + monthlyRate);
    }

    // Deduct goal withdrawals (excluding FIRE)
    if (m % 12 === 0 && m > 0) {
      const goalsThisYear = (goals || []).filter(g => Number(g.target_year) === year && g.name?.toLowerCase() !== 'fire');
      runningInvestments -= goalsThisYear.reduce((sum, g) => sum + (Number(g.target_amount) || 0), 0);
    }

    const currentLoanBalance = m < loanAmortization.length ? loanAmortization[m] : 0;
    
    if (currentLoanBalance <= 0 && loanPrincipal > 0 && !hasPaidOffHome) {
      hasPaidOffHome = true;
      homePayoffAge = Math.floor(age);
    }

    // Add to sunk costs (money gone forever)
    if (currentLoanBalance > 0 && m > 0) {
      cumulativeSunkCosts += loanEmi;
    }
    if (m > 0) {
      cumulativeSunkCosts += healthPremiumMonthly + lifePremiumMonthly;
    }
    
    // Net worth = investments + property - loan
    const runningNetWorth = runningInvestments + propertyValue - currentLoanBalance;
    const inflationAdjustedNetWorth = (Number(runningNetWorth) || 0) / Math.pow(1 + monthlyInflation, m);

    if (m % 12 === 0 || m === monthsToRetire) {
      projection.push({
        month: `Year ${Math.floor(m/12)}`,
        age: Math.floor(age),
        wealth: Math.max(0, Math.floor(runningNetWorth)), // Match key name used in Chart
        netWorth: Math.max(0, Math.floor(runningNetWorth)),
        investmentCorpus: Math.floor(runningInvestments),
        homeEquity: Math.max(0, propertyValue - currentLoanBalance),
        inflationAdjustedNetWorth: Math.max(0, Math.floor(inflationAdjustedNetWorth)),
        equity: Math.max(20, Math.min(80, (retirementAge - Math.floor(age)) * 3)),
        sunkCosts: Math.floor(cumulativeSunkCosts),
        homePayoffAge: homePayoffAge
      });
    }
  }

  return projection;
};

/**
 * Analyzes health and life insurance adequacy
 */
export const analyzeInsurance = (
  existingLifeCover: number, 
  annualIncome: number, 
  liabilities: number = 0,
  dependents: number = 0
): { required: number; gap: number; status: string; recommendation: string } => {
  const required = calculateRequiredLifeCover(annualIncome, liabilities, dependents);
  const gap = Math.max(0, required - existingLifeCover);
  
  return {
    required,
    gap,
    status: gap > 0 ? "Underinsured" : "Adequate",
    recommendation: gap > 0 
      ? `Increase life cover by ₹${(gap / 100000).toFixed(1)}L to secure dependents.`
      : "Your current life cover is sufficient."
  };
};

/**
 * Tax saving recommendations 
 */
export const recommendTaxSaving = (
  annualIncome: number, 
  existing80C: number, 
  taxRegime: 'old' | 'new'
) => {
  const suggestions: string[] = [];
  const comp = compareTaxRegimes(annualIncome, existing80C);
  
  if (taxRegime === 'old') {
    if (existing80C < INDIAN_TAX_OLD_REGIME.SECTION_80C_LIMIT) {
      suggestions.push(`Top up Section 80C by ₹${(INDIAN_TAX_OLD_REGIME.SECTION_80C_LIMIT - existing80C).toLocaleString()} using ELSS or PPF.`);
    }
    suggestions.push("Claim up to ₹50,000 for NPS under 80CCD(1B) if not done.");
  } else {
    suggestions.push("New Regime: Standard deduction applied. No additional exemptions required.");
  }

  return {
    regimeComparison: { oldTax: comp.oldTax, newTax: comp.newTax, recommended: comp.recommendation },
    suggestions
  };
};
