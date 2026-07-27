import { Show, useClerk, useUser } from '@clerk/expo';
import { FontAwesome } from "@expo/vector-icons";
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';

type Gender = 'male' | 'female'
type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderate' | 'active' | 'very_active'
type DietaryPreference = 'Normal' | 'vegetarian' | 'vegan'
type WeightGoal = 'weight_gain' | 'weight_loss' | 'maintain'

const { width } = Dimensions.get('window');

// Premium Global Colors
const COLORS = {
  emerald: '#10B981',
  emeraldDeep: '#047857',
  emeraldLight: '#ECFDF5',
  bg: '#F4F7F6',
  card: '#FFFFFF',
  textMain: '#111827',
  textMuted: '#6B7280',
  pillBg: '#F3F4F6',
  pillBorder: '#E5E7EB',
  white: '#FFFFFF',
  textDark: '#0F172A',  
}

// Unified Design Typography
const FONTS = {
  black: Platform.OS === 'ios' ? 'System' : 'sans-serif-layout',
  bold: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  medium: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  regular: Platform.OS === 'ios' ? 'System' : 'sans-serif',
};

const formatLabel = (text: string): string => {
  return text
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const AnimatedPill = <T extends string>({ option, isSelected, onPress }: { 
  option: T, 
  isSelected: boolean, 
  onPress: () => void 
}) => {
  const animation = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    animation.value = withTiming(isSelected ? 1 : 0, { duration: 250 });
  }, [isSelected]);

  const animatedViewStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        animation.value,
        [0, 1],
        [COLORS.pillBg, COLORS.emeraldLight]
      ),
      borderColor: interpolateColor(
        animation.value,
        [0, 1],
        [COLORS.pillBorder, COLORS.emerald]
      ),
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      color: interpolateColor(
        animation.value, 
        [0, 1],
        [COLORS.textMuted, COLORS.emeraldDeep]
      ),
    };
  });

  return (
    <Animated.View style={[styles.pill, animatedViewStyle]}>
      <Pressable onPress={onPress} style={styles.pillPressable}>
        <Animated.Text style={[styles.pillText, animatedTextStyle]}>
          {formatLabel(option)}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
};

export default function Page() {
  const { user } = useUser()
  const { signOut } = useClerk()

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/(auth)/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Loading state for the initial check
  const [isCheckingProfile, setIsCheckingProfile] = useState<boolean>(true);

  // Step state
  const [step, setStep] = useState<number>(1);
  const TOTAL_STEPS = 3;

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form states
  const [age, setAge] = useState<string>('')
  const [gender, setGender] = useState<Gender>("male")
  const [heightCm, setHeightCm] = useState<string>('')
  const [weightKg, setWeightKg] = useState<string>('')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate')
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>('Normal')
  const [weightGoal, setWeightGoal] = useState<WeightGoal>('maintain')
  const [preferLocalFood, setPreferLocalFood] = useState<boolean>(false)
  const [validationError, setValidationError] = useState<string>('')

  useEffect(() => {
    const checkExistingProfile = async () => {
      const userEmail = user?.primaryEmailAddress?.emailAddress;
      if (!userEmail) return;

      try {
        const BACKEND_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://172.20.10.10:5000';
        const response = await fetch(`${BACKEND_URL}/api/user-profile/${userEmail}`);
        const result = await response.json();

        if (response.ok && result.success && result.exists) {
          const profile = result.data;
          
          // 1. Map backend data back to frontend local inputs
          setAge(String(profile.age));
          setGender(profile.gender);
          setHeightCm(String(profile.height_cm));
          setWeightKg(String(profile.weight_kg));
          setActivityLevel(profile.activity_level);
          setDietaryPreference(profile.dietary_preference);
          setWeightGoal(profile.weight_goal);
          setPreferLocalFood(profile.prefer_local_food);

          // 2. Sneak them directly into the planner route since they are already onboarded
          router.replace({
            pathname: '/(tabs)/planner',
            params: { 
              age: String(profile.age), 
              gender: profile.gender, 
              height_cm: String(profile.height_cm), 
              weight_kg: String(profile.weight_kg), 
              activity_level: profile.activity_level, 
              dietary_preference: profile.dietary_preference, 
              weight_goal: profile.weight_goal, 
              prefer_local_food: profile.prefer_local_food ? 'true' : 'false'
            },
          });
        }
      } catch (error) {
        console.error("Error loading user profile state from DB:", error);
      } finally {
        setIsCheckingProfile(false);
      }
    };

    if (user) {
      checkExistingProfile();
    }
  }, [user]);


  // Animations
  const headerPulse = useSharedValue(0.9);
  const progressWidth = useSharedValue(1 / TOTAL_STEPS);

  useEffect(() => {
    headerPulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 4000 }),
        withTiming(0.9, { duration: 4000 })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    progressWidth.value = withTiming(step / TOTAL_STEPS, { duration: 300 });
  }, [step]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const validateBodyMetrics = () => {
    const parsedAge = Number(age);
    const parsedHeightCm = Number(heightCm);
    const parsedWeightKg = Number(weightKg);

    if (!age || !heightCm || !weightKg) {
      return 'Please fill in your Age, Height, and Weight before moving forward.';
    }

    if (!Number.isFinite(parsedAge) || parsedAge < 16 || parsedAge > 100) {
      return 'Age must be a realistic number between 16 and 100 years.';
    }

    if (!Number.isFinite(parsedHeightCm) || parsedHeightCm < 100 || parsedHeightCm > 250) {
      return 'Height must be between 100 cm and 250 cm.';
    }

    if (!Number.isFinite(parsedWeightKg) || parsedWeightKg < 20 || parsedWeightKg > 300) {
      return 'Weight must be between 20 kg and 300 kg.';
    }

    return '';
  };

  const handleNext = () => {
    if (step === 1) {
      const errorMessage = validateBodyMetrics();

      if (errorMessage) {
        setValidationError(errorMessage);
        return;
      }

      setValidationError('');
    }

    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // --- NEW: RENDER FULL-SCREEN LOADING SPINNER WHILE CHECKING DATABASE ---
  if (isCheckingProfile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg }}>
        <ActivityIndicator size="large" color={COLORS.emerald} />
        <Text style={{ marginTop: 12, color: COLORS.textMuted, fontFamily: FONTS.medium }}>Loading your profile...</Text>
      </View>
    );
  }

const handleContinue = async () => {
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const clerkId = user?.id;

  if (!userEmail || !clerkId) {
    alert("Authentication error: Please sign in again.");
    return;
  }

  const errorMessage = validateBodyMetrics();

  if (errorMessage) {
    setValidationError(errorMessage);
    alert(errorMessage);
    return;
  }

  setValidationError('');
  setIsSubmitting(true);

  try {
    // 🚨 IMPORTANT FOR EXPO: 
    // If testing on a physical phone, replace 'localhost' with your computer's local IP address (e.g., 192.168.1.50)
    const BACKEND_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://172.20.10.10:5000';

    const response = await fetch(`${BACKEND_URL}/api/user-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clerkId,
        email: userEmail,
        age,
        gender,
        heightCm,
        weightKg,
        activityLevel,
        dietaryPreference,
        weightGoal,
        preferLocalFood,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to save profile.");
    }

    // 2. Success! Navigate to the next screen
    router.push({
      pathname: '/(tabs)/planner',
      params: { age, gender, height_cm: heightCm, weight_kg: weightKg, activity_level: activityLevel, dietary_preference: dietaryPreference, weight_goal: weightGoal, prefer_local_food: preferLocalFood ? 'true' : 'false'},
    });

  } catch (error: any) {
    console.error("Network request error:", error);
    alert(`Could not save your profile: ${error.message}`);
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: COLORS.bg }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Show when="signed-in">
      </Show>

      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Show when="signed-in">
          {/* Header Section */}
          <Animated.View style={[styles.card, styles.header]} entering={FadeInDown.duration(800).delay(100)}>
            <View style={styles.headerTopRow}>
              <View style={styles.headerBadgeRow}>
                
                <Text style={styles.headerTag}>Personalized nutrition ready for you</Text>
              </View>
              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [
                  styles.signOutButton,
                  pressed && styles.signOutButtonPressed,
                ]}
              >
                <FontAwesome name="sign-out" size={20} width={20}  color={COLORS.white} />
                
              </Pressable>
            </View>
            <View style={styles.headerDivider} />
            <Text style={styles.greeting}>
              Hi, {user?.emailAddresses[0]?.emailAddress?.split('@')[0]}
            </Text>
            <Text style={styles.title}>Let's build your plan</Text>
            <Text style={styles.subtitle}>
              Tell us a bit about yourself so we can tailor the perfect diet for your goals.
            </Text>
            <View style={styles.progressContainer}>
              <Animated.View style={[styles.progressFill, animatedProgressStyle]} />
            </View>
            <Text style={styles.progressText}>Step {step} of {TOTAL_STEPS}</Text>
          </Animated.View>

          {/* Form Sections (Rendered Conditionally) */}
          <View style={styles.stepContainer}>
            {step === 1 && (
              <Animated.View key="step1" entering={FadeInRight.duration(400)} exiting={FadeOutLeft.duration(300)} style={styles.card}>
                <Text style={styles.sectionTitle}>Your Body Metrics</Text>
                <View style={styles.metricsRow}>
                  {[ {label: 'Age', placeholder: 'ex: 22', value: age, setter: setAge}, 
                     {label: 'Height (cm)', placeholder: 'ex: 180', value: heightCm, setter: setHeightCm}, 
                     {label: 'Weight (kg)', placeholder: 'ex: 70', value: weightKg, setter: setWeightKg}
                  ].map((item, index) => (
                    <View key={index} style={styles.metricBox}>
                      <Text style={styles.label}>{item.label}</Text>
                      <TextInput 
                        style={styles.metricInput} 
                        value={item.value} 
                        onChangeText={(value) => {
                          item.setter(value);
                          if (validationError) {
                            setValidationError('');
                          }
                        }} 
                        placeholder={item.placeholder}
                        keyboardType="number-pad" 
                        maxLength={3}
                      />
                    </View>
                  ))}
                </View>

                {validationError ? (
                  <Text style={styles.validationErrorText}>{validationError}</Text>
                ) : null}

                <Text style={[styles.label, { marginTop: 20 }]}>Gender</Text>
                <View style={styles.pillContainer}>
                  {(['male', 'female'] as const).map((option) => (
                    <AnimatedPill
                      key={option}
                      option={option}
                      isSelected={gender === option}
                      onPress={() => setGender(option)}
                    />
                  ))}
                </View>
                {/* STEP 1 */}
            {step === 1 && (
              <View style={styles.step1ButtonContainer}>
                <Pressable style={styles.primaryButton} onPress={handleNext}>
                  <Text style={styles.primaryButtonText}>Next</Text>
                </Pressable>
              </View>
            )}
              </Animated.View>
            )}

            {step === 2 && (
              <Animated.View key="step2" entering={FadeInRight.duration(400)} exiting={FadeOutLeft.duration(300)} style={styles.card}>
                <Pressable style={styles.backButton} onPress={handleBack}>
                  <FontAwesome  name = 'chevron-circle-left' size = {30} color = {COLORS.emerald}/>
                </Pressable>
                <Text style={styles.sectionTitle}>Lifestyle & Diet</Text>
                
                <Text style={styles.label}>Activity Level</Text>
                <View style={styles.pillContainer}>
                  {(['sedentary', 'lightly_active', 'moderate', 'active', 'very_active'] as const).map((option) => (
                    <AnimatedPill
                      key={option}
                      option={option}
                      isSelected={activityLevel === option}
                      onPress={() => setActivityLevel(option)}
                    />
                  ))}
                </View>

                <Text style={[styles.label, { marginTop: 20 }]}>Dietary Preference</Text>
                <View style={styles.pillContainer}>
                  {(['Normal', 'vegetarian', 'vegan'] as const).map((option) => (
                    <AnimatedPill
                      key={option}
                      option={option}
                      isSelected={dietaryPreference === option}
                      onPress={() => setDietaryPreference(option)}
                    />
                  ))}
                </View>

                <Text style={[styles.label, { marginTop: 20 }]}>Food Preference</Text>
                <View style={styles.pillContainer}>
                  {([
                    { value: false, label: 'Global Food' },
                    { value: true, label: 'Local Food' }
                  ] as const).map((option) => (
                    <Animated.View key={String(option.value)} style={styles.pill}>
                      <Pressable 
                        onPress={() => setPreferLocalFood(option.value)} 
                        style={({ pressed }) => [
                          styles.pillPressable,
                          {
                            backgroundColor: preferLocalFood === option.value ? COLORS.emeraldLight : COLORS.pillBg,
                            borderColor: preferLocalFood === option.value ? COLORS.emerald : COLORS.pillBorder,
                          },
                          pressed && { opacity: 0.7 }
                        ]}
                      >
                        <Text style={[
                          styles.pillText,
                          { color: preferLocalFood === option.value ? COLORS.emeraldDeep : COLORS.textMuted }
                        ]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    </Animated.View>
                  ))}
                </View>
                {/* STEP 2 */}
            {step === 2 && (
              <View style={styles.step2ButtonContainer}>
             
                
                <Pressable style={styles.primaryButton} onPress={handleNext}>
                  <Text style={styles.primaryButtonText}>Next</Text>
                </Pressable>
              </View>
            )}
              </Animated.View>
            )}

            {step === 3 && (
              <Animated.View key="step3" entering={FadeInRight.duration(400)} exiting={FadeOutLeft.duration(300)} style={styles.card}>
                <Pressable style={styles.backButton} onPress={handleBack}>
                  <FontAwesome  name = 'chevron-circle-left' size = {30} color = {COLORS.emerald}/>
                </Pressable>
                <Text style={styles.sectionTitle}>Your Goal</Text>
                
                <Text style={styles.label}>Weight Goal</Text>
                <View style={styles.pillContainer}>
                  {(['weight_gain', 'maintain', 'weight_loss'] as const).map((option) => {
                    const displayLabel = option === 'weight_gain' ? 'Weight Gain' : option === 'weight_loss' ? 'Weight Loss' : 'Maintain';
                    return (
                      <Animated.View key={option} style={styles.pill}>
                        <Pressable 
                          onPress={() => setWeightGoal(option)} 
                          style={({ pressed }) => [
                            styles.pillPressable,
                            {
                              backgroundColor: weightGoal === option ? COLORS.emeraldLight : COLORS.pillBg,
                              borderColor: weightGoal === option ? COLORS.emerald : COLORS.pillBorder,
                            },
                            pressed && { opacity: 0.7 }
                          ]}
                        >
                          <Text style={[
                            styles.pillText,
                            { color: weightGoal === option ? COLORS.emeraldDeep : COLORS.textMuted }
                          ]}>
                            {displayLabel}
                          </Text>
                        </Pressable>
                      </Animated.View>
                    );
                  })}
                </View>
                 {/* STEP 3 */}
            {step === 3 && (
  <View style={styles.step3ButtonContainer}>
    <Pressable 
      style={[styles.primaryButton, isSubmitting && { opacity: 0.7 }]} 
      onPress={handleContinue}
      disabled={isSubmitting}
    >
      {isSubmitting ? (
        <ActivityIndicator color={COLORS.white} size="small" />
      ) : (
        <Text style={styles.primaryButtonText}>Generate Meal Plan</Text>
      )}
    </Pressable>
  </View>
)}
              </Animated.View>
            )}
          </View>

        {/* Action Buttons Footer */}
          <Animated.View style={styles.footer} entering={FadeInDown.duration(800).delay(400)}>
            
          
       

           

          </Animated.View>

        </Show>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: 24,
    paddingTop: 80,
    paddingBottom: 40,
    flexGrow: 1, 
  },
  signOutWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 20,
    left: 10,
    zIndex: 99,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.emerald,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  signOutButtonPressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  signOutText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  header: {
    marginBottom: 24,
    position: 'relative',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 26,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.12)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    marginBottom: 16,
    borderRadius: 1,
  },
  headerTag: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.emeraldDeep,
  },
  greeting: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.emeraldDeep,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'capitalize',
    zIndex: 1,
  },
  title: {
    fontFamily: FONTS.black,
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textMain,
    marginBottom: 8,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textMuted,
    lineHeight: 22,
    marginBottom: 20,
    zIndex: 1,
  },
  sparkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
    zIndex: 1,
  },
  sparkChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.16)',
  },
  sparkLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.emeraldDeep,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
    zIndex: 1,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  summaryCardTitle: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryCardValue: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.textMain,
  },
  progressContainer: {
    height: 6,
    backgroundColor: COLORS.pillBorder,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.emerald,
    borderRadius: 3,
  },
  progressText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'right',
  },
  stepContainer: {
    minHeight: 280, 
    marginBottom: 30,
    bottom: 10
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 18,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricBox: {
    flex: 1,
  },
  metricInput: {
    fontFamily: FONTS.black,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textMain,
    textAlign: 'center',
  },
  validationErrorText: {
    marginTop: 12,
    color: '#DC2626',
    fontFamily: FONTS.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    backgroundColor: COLORS.pillBg,
  },
  pillPressable: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pillText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  footer: {
    marginTop: 'auto',
    marginBottom: 30,
  },
  // -- Edit Step 1 Button Positioning Here --
  step1ButtonContainer: {
    marginTop: 20,
    justifyContent: 'center',
    width: '100%',
    
  },

  // -- Edit Step 2 Buttons Positioning Here --
  step2ButtonContainer: {
    
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
    marginTop: 20
  },

  // -- Edit Step 3 Buttons Positioning Here --
  step3ButtonContainer: {
    
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
    marginTop: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    marginBottom: 10,
    borderRadius: 3,
    paddingVertical: 2,
    alignItems: 'flex-end',
    flexDirection: 'row'
    
  },
  backButtonText: {
    fontFamily: FONTS.bold,
    color: COLORS.textMain,
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: COLORS.emerald,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.emerald,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
    
  },
  primaryButtonText: {
    fontFamily: FONTS.bold,
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
})