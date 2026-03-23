export const DEFAULT_RETURNS = {
  equity: 0.10, // 10%
  debt: 0.06,   // 6%
  gold: 0.08,   // 8%
  realEstate: 0.08, // 8%
};

export const INFLATION_RATE = 0.06; // 6%
export const SAFE_WITHDRAWAL_RATE = 0.04; // 4%
export const LIFE_COVER_MULTIPLIER = 10; // 10 times annual income

export const ASSET_CLASS_EXPECTED_RETURNS: Record<string, number> = {
  'Equity': 0.12,
  'Debt': 0.07,
  'Gold': 0.08,
  'Cash': 0.04,
  'RealEstate': 0.09
};
