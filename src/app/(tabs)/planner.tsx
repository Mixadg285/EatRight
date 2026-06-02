import { FontAwesome } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { SafeAreaView } from 'react-native-safe-area-context';
import { useMealPlan } from '../../contexts/MealPlanContext';

const BASE_URL = "http://192.168.100.137:8000";
const { width } = Dimensions.get("window");

type PlannerSearchParams = {
  age: number;
  gender: string;
  height_cm: number;
  weight_kg: number;
  activity_level: string;
  dietary_preference: string;
  weight_goal: string;
};

const defaultPlannerParams: PlannerSearchParams = {
  age: 22,
  gender: 'male',
  height_cm: 175,
  weight_kg: 60,
  activity_level: 'moderate',
  dietary_preference: 'omnivore',
  weight_goal: 'maintain',
};

const parseSearchParams = (params: Record<string, string | string[] | undefined>): Partial<PlannerSearchParams> => ({
  age: params.age ? parseInt(params.age as string, 10) : undefined,
  gender: params.gender ? (params.gender as string) : undefined,
  height_cm: params.height_cm ? parseInt(params.height_cm as string, 10) : undefined,
  weight_kg: params.weight_kg ? parseInt(params.weight_kg as string, 10) : undefined,
  activity_level: params.activity_level ? (params.activity_level as string) : undefined,
  dietary_preference: params.dietary_preference ? (params.dietary_preference as string) : undefined,
  weight_goal: params.weight_goal ? (params.weight_goal as string) : undefined,
});

const hasSearchParams = (params: Partial<PlannerSearchParams>) =>
  Object.values(params).some((value) => value !== undefined);

// Premium Emerald & Slate Palette
const COLORS = {
  emerald: '#10B981',
  emeraldDeep: '#047857',
  emeraldLight: '#ECFDF5',
  bg: '#F4F7F6',
  card: '#FFFFFF',
  textMain: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  errorBg: '#FEF2F2',
  errorText: '#EF4444',
};

// Optimized Platform Typography
const FONTS = {
  black: Platform.OS === 'ios' ? 'System' : 'sans-serif-layout',
  bold: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  medium: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  regular: Platform.OS === 'ios' ? 'System' : 'sans-serif',
};

export default function TestModelsPage() {
  const params = useLocalSearchParams();
  const [calories, setCalories] = useState<number | null>(null);
  const [mealPlan, setMealPlan] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plannerParams, setPlannerParams] = useState<PlannerSearchParams>(defaultPlannerParams);
  const [hasGeneratedParams, setHasGeneratedParams] = useState(false);
  const { setMealPlanData } = useMealPlan();

  const parsedParams = useMemo(
    () => parseSearchParams(params as Record<string, string | undefined>),
    [params.age, params.gender, params.height_cm, params.weight_kg, params.activity_level, params.dietary_preference, params.weight_goal],
  );

  useEffect(() => {
    if (!hasSearchParams(parsedParams)) {
      return;
    }

    setPlannerParams((current) => ({
      age: parsedParams.age ?? current.age,
      gender: parsedParams.gender ?? current.gender,
      height_cm: parsedParams.height_cm ?? current.height_cm,
      weight_kg: parsedParams.weight_kg ?? current.weight_kg,
      activity_level: parsedParams.activity_level ?? current.activity_level,
      dietary_preference: parsedParams.dietary_preference ?? current.dietary_preference,
      weight_goal: parsedParams.weight_goal ?? current.weight_goal,
    }));
    setHasGeneratedParams(true);
  }, [parsedParams]);

  async function testModels(paramsToUse: PlannerSearchParams) {
    try {
      setLoading(true);
      setError(null);

      const mealPlanResult = await fetch(`${BASE_URL}/predict_and_recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paramsToUse),
      }).then((r) => r.json());

      console.log("mealPlanResult", mealPlanResult);
      const newCalories = mealPlanResult?.predicted_calories ?? null;
      const newMealPlan = mealPlanResult?.meal_plan ?? {};
      
      setCalories(newCalories);
      setMealPlan(newMealPlan);
      
      // Save to context for insights tab
      setMealPlanData(newMealPlan, newCalories, paramsToUse);
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the ML model engine server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hasGeneratedParams) {
      return;
    }

    testModels(plannerParams);
  }, [plannerParams, hasGeneratedParams]);

  // Utility to clean up and structure meal titles
  const formatMealTitle = (title: string) => {
    return title.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <SafeAreaView style={styles.outerContainer}>
     
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Branding */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <View>
            <Text style={styles.title}>Daily Diet Scope</Text>
            <Text style={styles.subtitle}>Predictive ML Recommendation Engine</Text>
          </View>
          <View style={styles.engineBadge}>
            <FontAwesome name="bolt" size={12} color={COLORS.emeraldDeep} />
            <Text style={styles.engineText}>AI ACTIVE</Text>
          </View>
        </Animated.View>

        {/* Global States Wrapper */}
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={COLORS.emerald} />
            <Text style={styles.loadingText}>Synthesizing personalized targets...</Text>
          </View>
        ) : (
          <>
            {/* Calorie Goal Summary Card */}
            <Animated.View entering={FadeInDown.duration(600).delay(150)} style={styles.heroCard}>
              <View style={styles.heroDecorCircle} />
              <Text style={styles.heroLabel}>PREDICTED CALORIES</Text>
              <Text style={styles.heroValue}>
                {calories === null ? "—" : calories.toFixed(0)}
                <Text style={styles.heroUnit}> kcal/day</Text>
              </Text>
              <Text style={styles.heroDescription}>
                Calculated balance optimized for target metabolic output.
              </Text>
            </Animated.View>

            {/* Error Message Layout */}
            {error ? (
              <Animated.View entering={FadeIn.duration(400)} style={styles.errorContainer}>
                <FontAwesome name="exclamation-circle" size={16} color={COLORS.errorText} />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            {/* Empty Context State */}
            {Object.keys(mealPlan).length === 0 && !error ? (
              <View style={styles.emptyCard}>
                <FontAwesome name="folder-open-o" size={28} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No recommendations generated yet.</Text>
              </View>
            ) : (
              /* Meal Segment Cards Iteration */
              Object.entries(mealPlan).map(([mealType, items]: [string, any], sectionIdx) => (
                <Animated.View 
                  entering={FadeInDown.duration(600).delay(200 + sectionIdx * 100)} 
                  key={mealType} 
                  style={styles.mealCard}
                >
                  <View style={styles.mealHeader}>
                    <FontAwesome name="cutlery" size={14} color={COLORS.emerald} />
                    <Text style={styles.mealTypeTitle}>{formatMealTitle(mealType)}</Text>
                  </View>

                  {Array.isArray(items) && items.length > 0 ? (
                    items.map((item: any, idx: number) => (
                      <View key={idx} style={[styles.mealItem, idx === items.length - 1 && styles.lastMealItem]}>
                        <Text style={styles.foodName}>{item.Food_name}</Text>
                        
                        {/* Interactive Row Badge Architecture */}
                        <View style={styles.macroBadgeRow}>
                          <View style={[styles.macroBadge, { backgroundColor: '#EEF2F6' }]}>
                            <Text style={styles.macroBadgeText}>{item.Calories.toFixed(0)} kcal</Text>
                          </View>
                          <View style={[styles.macroBadge, styles.proteinTint]}>
                            <Text style={[styles.macroBadgeText, styles.proteinText]}>P: {item.Protein.toFixed(1)}g</Text>
                          </View>
                          <View style={[styles.macroBadge, styles.carbsTint]}>
                            <Text style={[styles.macroBadgeText, styles.carbsText]}>C: {item.Carbohydrates.toFixed(1)}g</Text>
                          </View>
                          <View style={[styles.macroBadge, styles.fatsTint]}>
                            <Text style={[styles.macroBadgeText, styles.fatsText]}>F: {item.Fats.toFixed(1)}g</Text>
                          </View>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noFood}>No customized options targeted for this timeline.</Text>
                  )}
                </Animated.View>
              ))
            )}
          </>
        )}
         {/* Modern Fixed Action Area */}
      <View style={styles.footerActionContainer}>
        <Pressable 
          disabled={loading}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled
          ]} 
          onPress={() => testModels(plannerParams)}
        >
          <FontAwesome name="refresh" size={16} color={COLORS.white} style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Recompute Matrix Plan</Text>
        </Pressable>
      </View>
      </ScrollView>
      

     
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 10 : 44,
    paddingBottom: 110, // Ensures text scrolling space above button sheet
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: FONTS.black,
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.textMain,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  engineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.emeraldLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  engineText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.emeraldDeep,
  },
  heroCard: {
    backgroundColor: COLORS.emeraldDeep,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: COLORS.emeraldDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  heroDecorCircle: {
    position: 'absolute',
    right: -30,
    bottom: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.emerald,
    opacity: 0.2,
  },
  heroLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.emeraldLight,
    letterSpacing: 1.5,
  },
  heroValue: {
    fontFamily: FONTS.black,
    fontSize: 38,
    fontWeight: '900',
    color: COLORS.white,
    marginTop: 6,
    letterSpacing: -1,
  },
  heroUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.emeraldLight,
  },
  heroDescription: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 8,
    lineHeight: 18,
  },
  centerState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorBg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    marginBottom: 20,
  },
  errorText: {
    fontFamily: FONTS.medium,
    color: COLORS.errorText,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  mealCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
    marginBottom: 14,
  },
  mealTypeTitle: {
    fontFamily: FONTS.black,
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textMain,
    letterSpacing: 1,
  },
  mealItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  lastMealItem: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  foodName: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textMain,
  },
  macroBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  macroBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  macroBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  proteinTint: { backgroundColor: '#EFF6FF' },
  proteinText: { color: '#2563EB' },
  carbsTint: { backgroundColor: '#FFF7ED' },
  carbsText: { color: '#EA580C' },
  fatsTint: { backgroundColor: '#FDF4FF' },
  fatsText: { color: '#C084FC' },
  noFood: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: "italic",
    textAlign: 'center',
    paddingVertical: 10,
  },
  footerActionContainer: {
    position: 'absolute',
    bottom: 25,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(244, 247, 246, 0.9)',
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 12,
  },
  button: {
    backgroundColor: COLORS.emerald,
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: "center",
    justifyContent: 'center',
    shadowColor: COLORS.emerald,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: COLORS.emeraldDeep,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontFamily: FONTS.bold,
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
});