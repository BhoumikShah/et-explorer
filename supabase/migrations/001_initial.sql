-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age INTEGER NOT NULL,
  retirement_age INTEGER NOT NULL,
  monthly_income NUMERIC NOT NULL,
  monthly_expenses NUMERIC NOT NULL,
  risk_tolerance TEXT NOT NULL CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
  tax_regime TEXT NOT NULL CHECK (tax_regime IN ('old', 'new')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create investments table
CREATE TABLE IF NOT EXISTS public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_class TEXT NOT NULL,
  current_value NUMERIC NOT NULL,
  expected_return NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on investments
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own investments" ON public.investments
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own investments" ON public.investments
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own investments" ON public.investments
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own investments" ON public.investments
  FOR DELETE USING (auth.uid() = profile_id);

-- Create goals table
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_year INTEGER NOT NULL,
  target_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals" ON public.goals
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own goals" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own goals" ON public.goals
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own goals" ON public.goals
  FOR DELETE USING (auth.uid() = profile_id);

-- Create insurance table
CREATE TABLE IF NOT EXISTS public.insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  life_coverage NUMERIC NOT NULL,
  health_coverage NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on insurance
ALTER TABLE public.insurance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insurance" ON public.insurance
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own insurance" ON public.insurance
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own insurance" ON public.insurance
  FOR UPDATE USING (auth.uid() = profile_id);
