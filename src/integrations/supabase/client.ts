// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://yvxmkixhezvdmazculvo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2eG1raXhoZXp2ZG1hemN1bHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1NzUxNDQsImV4cCI6MjA1MjE1MTE0NH0.iP8a8SbBgnvGQ4D2hBElEcxGPm9pP3Ytx5DRCy7Zhv8";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);