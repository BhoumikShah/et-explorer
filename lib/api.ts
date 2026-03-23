import { supabase } from './supabase'

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, investments(*), goals(*), insurance(*)')
    .eq('id', userId)
    .single()
  
  return { data, error }
}

export type ProfileFormValues = {
  personal: {
    age: number
    retirement_age: number
    monthly_income: number
    monthly_expenses: number
    current_savings?: number
    monthly_investment_budget?: number
    risk_tolerance: 'conservative' | 'moderate' | 'aggressive'
    tax_regime: 'old' | 'new'
  }
  investments: {
    asset_class: string
    current_value: number
    expected_return: number
  }[]
  goals: {
    name: string
    target_year: number
    target_amount: number
  }[]
  insurance: {
    life_coverage: number
    health_coverage: number
  }
}

export const saveFullProfile = async (userId: string, data: ProfileFormValues) => {
  // 1. Save Profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      age: data.personal.age,
      retirement_age: data.personal.retirement_age,
      monthly_income: data.personal.monthly_income,
      monthly_expenses: data.personal.monthly_expenses,
      current_savings: data.personal.current_savings || 0,
      monthly_investment_budget: data.personal.monthly_investment_budget || 0,
      risk_tolerance: data.personal.risk_tolerance,
      tax_regime: data.personal.tax_regime,
      updated_at: new Date().toISOString(),
    })
  
  if (profileError) return { error: profileError }

  // 2. Save Investments
  await supabase.from('investments').delete().eq('profile_id', userId)
  const { error: invError } = await supabase
    .from('investments')
    .insert(
      data.investments.map(inv => ({
        profile_id: userId,
        asset_class: inv.asset_class,
        current_value: inv.current_value,
        expected_return: inv.expected_return,
      }))
    )
  if (invError) return { error: invError }

  // 3. Save Goals
  await supabase.from('goals').delete().eq('profile_id', userId)
  const { error: goalError } = await supabase
    .from('goals')
    .insert(
      data.goals.map(goal => ({
        profile_id: userId,
        name: goal.name,
        target_year: goal.target_year,
        target_amount: goal.target_amount,
      }))
    )
  if (goalError) return { error: goalError }

  // 4. Save Insurance
  await supabase.from('insurance').delete().eq('profile_id', userId)
  const { error: insError } = await supabase
    .from('insurance')
    .insert({
      profile_id: userId,
      life_coverage: data.insurance.life_coverage,
      health_coverage: data.insurance.health_coverage,
    })
  if (insError) return { error: insError }

  return { error: null }
}
