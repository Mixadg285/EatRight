import { Show, useClerk, useUser } from '@clerk/expo';
import { FontAwesome } from "@expo/vector-icons";
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
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
  FadeIn,
  FadeInDown,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';

type Gender = 'male' | 'female'
type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderate' | 'active' | 'very_active'
type DietaryPreference = 'omnivore' | 'vegetarian' | 'vegan'
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

  const [age, setAge] = useState<string>('22')
  const [gender, setGender] = useState<Gender>('male')
  const [heightCm, setHeightCm] = useState<string>('180')
  const [weightKg, setWeightKg] = useState<string>('70')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate')
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>('omnivore')
  const [weightGoal, setWeightGoal] = useState<WeightGoal>('maintain')

  const headerPulse = useSharedValue(0.9);

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

  const animatedHeaderShapeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerPulse.value }],
  }));

  const handleContinue = () => {
    router.push({
      pathname: '/(tabs)/planner',
      params: { age, gender, height_cm: heightCm, weight_kg: weightKg, activity_level: activityLevel, dietary_preference: dietaryPreference, weight_goal: weightGoal },
    })
  }

  return (
    
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: COLORS.bg }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Show when="signed-in">
        {/* Fixed Top-Right Glass Sign Out Action */}
        <Animated.View entering={FadeIn.delay(300)} style={styles.signOutWrapper}>
          <Pressable
            onPress={() => signOut()}
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && styles.signOutButtonPressed
            ]}
          >
            <FontAwesome name="sign-out" size={13} color={COLORS.textMuted} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </Animated.View>
      </Show>

      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Show when="signed-in">
          {/* Header Section */}
          <Animated.View style={styles.header} entering={FadeInDown.duration(800).delay(100)}>
            <Animated.View style={[styles.headerShape1, animatedHeaderShapeStyle]} />
            <Animated.View style={[styles.headerShape2, animatedHeaderShapeStyle]} />
            
            <Text style={styles.greeting}>
              Hi, {user?.emailAddresses[0]?.emailAddress?.split('@')[0]} 
            </Text>
            <Text style={styles.title}>Let's build your plan</Text>
            <Text style={styles.subtitle}>
              Tell us a bit about yourself so we can tailor the perfect diet for your goals.
            </Text>
          </Animated.View>

          {/* Body Metrics Card */}
          <Animated.View style={styles.card} entering={FadeInDown.duration(800).delay(300)}>
            <Text style={styles.sectionTitle}>Your Body Metrics</Text>
            <View style={styles.metricsRow}>
              {[ {label: 'Age', value: age, setter: setAge}, 
                 {label: 'Height (cm)', value: heightCm, setter: setHeightCm}, 
                 {label: 'Weight (kg)', value: weightKg, setter: setWeightKg}
              ].map((item, index) => (
                <View key={index} style={styles.metricBox}>
                  <Text style={styles.label}>{item.label}</Text>
                  <TextInput 
                    style={styles.metricInput} 
                    value={item.value} 
                    onChangeText={item.setter} 
                    keyboardType="number-pad" 
                    maxLength={3}
                  />
                </View>
              ))}
            </View>

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
          </Animated.View>

          {/* Lifestyle Card */}
          <Animated.View style={styles.card} entering={FadeInDown.duration(800).delay(500)}>
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
              {(['omnivore', 'vegetarian', 'vegan'] as const).map((option) => (
                <AnimatedPill
                  key={option}
                  option={option}
                  isSelected={dietaryPreference === option}
                  onPress={() => setDietaryPreference(option)}
                />
              ))}
            </View>
          </Animated.View>

          {/* Weight Goal Card */}
          <Animated.View style={styles.card} entering={FadeInDown.duration(800).delay(600)}>
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
          </Animated.View>

          {/* Action Buttons Footer */}
          <Animated.View style={styles.footer} entering={FadeInDown.duration(800).delay(800)}>
            <Pressable style={styles.primaryButton} onPress={handleContinue}>
              <Text style={styles.primaryButtonText}>Generate Meal Plan</Text>
            </Pressable>
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
  },
  signOutWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 20,
    right: 24,
    zIndex: 99,
  },
 signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    // Ultra-soft translucent emerald tint
    backgroundColor: 'rgba(16, 185, 129, 0.08)', 
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 6,
  },
  signOutButtonPressed: {
    transform: [{ scale: 0.96 }],
    // Deepens background slightly on touch
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  signOutText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    fontWeight: '600',
    // Using your deep emerald for sharp text legibility
    color: COLORS.emeraldDeep, 
  },
  header: {
    marginBottom: 28,
    position: 'relative',
  },
  headerShape1: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLORS.emerald,
    opacity: 0.06,
  },
  headerShape2: {
    position: 'absolute',
    top: 30,
    right: 50,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.emerald,
    opacity: 0.04,
  },
  greeting: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.emeraldDeep,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'capitalize',
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
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  pillPressable: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pillText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    marginTop: 9,
    marginBottom: 65
  },
  primaryButton: {
    backgroundColor: COLORS.emerald,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
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