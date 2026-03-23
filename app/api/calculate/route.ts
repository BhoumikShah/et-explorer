import { NextResponse } from 'next/server';
import { 
  calculateEmergencyFund, 
  calculateSIP, 
  getGlidePath, 
  calculateNetWorthProjection, 
  calculateFIRECorpus,
  calculateCoastFI,
  FIRE_TYPES
} from '../../../lib/calculations/fireCalculator';
import { analyzeInsurance, recommendTaxSaving } from '../../../lib/calculations/fireCalculator';
import { DEFAULT_RETURNS, INFLATION_RATE } from '../../../lib/knowledgeBase/assetReturns';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { profile, investments, goals, insurance, whatIf } = body;

    const age = profile.age;
    const retirementAge = whatIf?.retirementAge || profile.retirement_age;
    const yearsToRetire = Math.max(retirementAge - age, 1);
    
    const swr = whatIf?.swr || 0.04;
    const expectedReturn = whatIf?.expectedReturn || 0.10;
    const inflationRate = whatIf?.inflationRate || 0.06;

    // 1. Emergency Fund
    const emergencyFundTarget = calculateEmergencyFund(profile.monthly_expenses || 0);

    // 2. FIRE Corpus Scenarios
    const fireScenarios = {
      lean: calculateFIRECorpus(profile.monthly_expenses, yearsToRetire, swr, FIRE_TYPES.lean, inflationRate),
      regular: calculateFIRECorpus(profile.monthly_expenses, yearsToRetire, swr, FIRE_TYPES.regular, inflationRate),
      fat: calculateFIRECorpus(profile.monthly_expenses, yearsToRetire, swr, FIRE_TYPES.fat, inflationRate),
    };

    // 3. CoastFI Number
    const targetFIRECorpus = fireScenarios.regular.corpusNeeded;
    const coastFINumber = calculateCoastFI(targetFIRECorpus, yearsToRetire, expectedReturn, inflationRate);

    // 4. Net Worth Projection (adjusted for What-If)
    const currentAssets = (investments || []).reduce((sum: number, inv: any) => sum + (inv.current_value || 0), 0) + (profile.current_savings || 0);
    
    // SIP Calculation for FIRE specifically
    const fireSIP = calculateSIP(targetFIRECorpus, yearsToRetire, expectedReturn, currentAssets);

    const netWorthProjection = calculateNetWorthProjection(
      profile,
      investments || [],
      goals || [],
      whatIf?.monthlySIP || (profile.monthly_investment_budget || fireSIP),
      { retirementAge, expectedReturn, inflationRate }
    );

    // 5. Readiness
    const currentNetWorth = netWorthProjection[0]?.netWorth || currentAssets;
    const readiness = (currentNetWorth / targetFIRECorpus) * 100;

    // 6. Insurance Gap
    const insuranceAnalysis = analyzeInsurance(
      insurance?.life_coverage || 0,
      profile.monthly_income * 12,
      (goals || []).reduce((sum: number, g: any) => sum + (g.target_amount || 0), 0)
    );

    // 7. Tax Recommendations
    const taxRecommendations = recommendTaxSaving(
      profile.monthly_income * 12,
      0, // Placeholder for existing investments if not tracked
      profile.tax_regime || 'new'
    );

    return NextResponse.json({
      emergencyFundTarget,
      fireScenarios,
      coastFINumber,
      netWorthProjection,
      readiness: Math.min(Math.round(readiness), 100),
      currentNetWorth,
      targetFIRECorpus,
      fireSIP,
      insuranceAnalysis,
      taxRecommendations
    });

  } catch (error: any) {
    console.error('Calculation API Error:', error);
    return NextResponse.json({ error: error.message || 'Simulation engine failed.' }, { status: 500 });
  }
}
