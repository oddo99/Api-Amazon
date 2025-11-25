import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Example usage:
// const { data, error } = await supabase
//   .from('products')
//   .select()
//   .eq('accountId', 'some-id')
