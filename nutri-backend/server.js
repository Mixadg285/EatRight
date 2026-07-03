require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json()); // Allows server to read JSON sent by Expo

// Initialize Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Define the API Endpoint
app.post('/api/user-profile', async (req, res) => {
  const { clerkId, email, age, gender, heightCm, weightKg, activityLevel, dietaryPreference, weightGoal, preferLocalFood } = req.body;

  try {
    // UPSERT: If email exists, update it. If not, insert a new record.
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(
        { 
          clerk_id: clerkId, 
          email: email, 
          age: parseInt(age), 
          gender, 
          height_cm: parseFloat(heightCm), 
          weight_kg: parseFloat(weightKg), 
          activity_level: activityLevel, 
          dietary_preference: dietaryPreference, 
          weight_goal: weightGoal, 
          prefer_local_food: preferLocalFood 
        }, 
        { onConflict: 'email' }
      )
      .select();

    if (error) throw error;

    return res.status(200).json({ success: true, message: "Profile saved successfully!", data });
  } catch (error) {
    console.error("Database Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
// New Endpoint: Fetch user profile data by email
app.get('/api/user-profile/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single(); // We only expect one row per user

    if (error) {
      // If no row is found, Supabase returns a PGRST116 error code. 
      // This is normal for a brand new user onboarding.
      if (error.code === 'PGRST116') {
        return res.status(200).json({ success: true, exists: false });
      }
      throw error;
    }

    return res.status(200).json({ success: true, exists: true, data });
  } catch (error) {
    console.error("Fetch Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));