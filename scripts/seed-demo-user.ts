import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const DEMO_USER_ID = '8b91a19e-4939-4cf5-aec1-0e23d0ccf628';

async function seed() {
  console.log('🌱 Seeding demo user (Enhanced)...');

  // 1. Upsert Profile with new fields
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: DEMO_USER_ID,
      age: 30,
      retirement_age: 60,
      monthly_income: 100000,
      monthly_expenses: 50000,
      current_savings: 500000, // Added
      monthly_investment_budget: 30000, // Added
      risk_tolerance: 'moderate',
      tax_regime: 'new',
      updated_at: new Date().toISOString(),
    });

  if (profileError) {
    console.error('Error seeding profile:', profileError);
    return;
  }

  // 2. Clear existing entries
  await supabase.from('investments').delete().eq('profile_id', DEMO_USER_ID);
  await supabase.from('goals').delete().eq('profile_id', DEMO_USER_ID);
  await supabase.from('insurance').delete().eq('profile_id', DEMO_USER_ID);

  // 3. Insert Investments
  await supabase.from('investments').insert([
    { profile_id: DEMO_USER_ID, asset_class: 'Equity', current_value: 500000, expected_return: 0.12 },
    { profile_id: DEMO_USER_ID, asset_class: 'Debt', current_value: 200000, expected_return: 0.07 },
  ]);

  // 4. Insert Goals
  await supabase.from('goals').insert([
    { profile_id: DEMO_USER_ID, name: 'FIRE Corpus', target_amount: 30000000, target_year: 2056 },
    { profile_id: DEMO_USER_ID, name: 'Child Venture', target_amount: 5000000, target_year: 2041 },
  ]);

  // 5. Insert Insurance
  await supabase.from('insurance').insert([
    { profile_id: DEMO_USER_ID, life_coverage: 10000000, health_coverage: 500000 },
  ]);

  console.log('✅ Seeding complete!');
}

seed();
