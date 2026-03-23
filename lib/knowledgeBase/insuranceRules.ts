export function calculateRequiredLifeCover(annualIncome: number, liabilities: number, dependents: number): number {
  const baseCover = annualIncome * 10; // Simple 10x income multiplier
  const plusLiabilities = baseCover + liabilities;
  const plusDependentsBenefit = plusLiabilities + (dependents * 1000000); // 10L per dependent buffer
  
  return plusDependentsBenefit;
}

export function assessHealthCover(existingCover: number, familySize: number, location: 'metro' | 'non-metro' = 'metro'): { adequate: boolean; suggestedCover: number } {
  const baseTarget = location === 'metro' ? 1000000 : 500000;
  const familyMultiplier = 1 + (familySize - 1) * 0.5; // +50% per extra family member
  
  const suggestedCover = baseTarget * familyMultiplier;
  const adequate = existingCover >= suggestedCover;
  
  return { adequate, suggestedCover };
}
