import { FontAwesome } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMealPlan } from '../../contexts/MealPlanContext';

const COLORS = {
  bg: '#F4F7F6',
  card: '#FFFFFF',
  textMain: '#111827',
  textMuted: '#6B7280',
  emerald: '#10B981',
  emeraldDeep: '#047857',
  emeraldLight: '#ECFDF5',
  border: '#E5E7EB',
};

const FONTS = {
  black: Platform.OS === 'ios' ? 'System' : 'sans-serif-layout',
  bold: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  medium: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  regular: Platform.OS === 'ios' ? 'System' : 'sans-serif',
};

// Calculate BMI: weight (kg) / (height (m) ^ 2)
const calculateBMI = (weightKg: number, heightCm: number): number => {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
};

// Calculate BMR using Mifflin-St Jeor formula
const calculateBMR = (weightKg: number, heightCm: number, age: number, gender: string): number => {
  if (gender === 'male') {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
  } else {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
  }
};

// Extract macros from meal plan data
const extractMacros = (mealPlan: any) => {
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;

  Object.entries(mealPlan).forEach(([_, items]: [string, any]) => {
    if (Array.isArray(items)) {
      items.forEach((item: any) => {
        totalProtein += item.Protein || 0;
        totalCarbs += item.Carbohydrates || 0;
        totalFats += item.Fats || 0;
      });
    }
  });

  return [
    { label: 'Protein', value: Math.round(totalProtein), color: '#2563EB', tint: '#EFF6FF' },
    { label: 'Carbs', value: Math.round(totalCarbs), color: '#F59E0B', tint: '#FFF7ED' },
    { label: 'Fats', value: Math.round(totalFats), color: '#A855F7', tint: '#F5F3FF' },
  ];
};

// Extract meal highlights from meal plan data
const extractMealHighlights = (mealPlan: any) => {
  const mealNotes: { [key: string]: string } = {
    breakfast: 'Balanced start with fiber and protein',
    lunch: 'Higher energy meal for mid-day focus',
    dinner: 'Light but satisfying evening plate',
    snack: 'Quick bite to keep momentum steady',
  };

  return Object.entries(mealPlan).map(([mealType, items]: [string, any]) => {
    let totalKcal = 0;
    if (Array.isArray(items)) {
      items.forEach((item: any) => {
        totalKcal += item.Calories || 0;
      });
    }
    const displayMealName = mealType.replace(/_/g, ' ').charAt(0).toUpperCase() + mealType.replace(/_/g, ' ').slice(1);
    return {
      name: displayMealName,
      kcal: `${Math.round(totalKcal)} kcal`,
      note: mealNotes[mealType.toLowerCase()] || 'Well balanced meal',
    };
  });
};

const InsightsScreen = () => {
  const { mealPlan, calories, userParams } = useMealPlan();
  
  const macroData = useMemo(() => extractMacros(mealPlan), [mealPlan]);
  const mealHighlights = useMemo(() => extractMealHighlights(mealPlan), [mealPlan]);
  
  const bmi = useMemo(() => {
    if (!userParams) return null;
    return calculateBMI(userParams.weight_kg, userParams.height_cm);
  }, [userParams]);

  const bmr = useMemo(() => {
    if (!userParams) return null;
    return calculateBMR(userParams.weight_kg, userParams.height_cm, userParams.age, userParams.gender);
  }, [userParams]);

  const getBMIStatus = (bmi: number | null) => {
    if (!bmi) return 'Unknown';
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal range';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  const displayCalories = calories ?? 1800;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Nutrition Overview</Text>
            <Text style={styles.title}>Your food insights</Text>
            <Text style={styles.subtitle}>A quick summary of your daily nutrition profile and meal balance.</Text>
          </View>
          <View style={styles.badge}>
            <FontAwesome name="pie-chart" size={12} color={COLORS.emeraldDeep} />
            <Text style={styles.badgeText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>PREDICTED DAILY CALORIES</Text>
          <Text style={styles.heroValue}>{Math.round(displayCalories).toLocaleString()}<Text style={styles.heroUnit}> kcal</Text></Text>
          <Text style={styles.heroDescription}>This estimate is based on your profile and should help guide your meal choices.</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>BMI</Text>
            <Text style={styles.statValue}>{bmi ?? 'N/A'}</Text>
            <Text style={styles.statMeta}>{bmi ? getBMIStatus(bmi) : 'No data'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>BMR</Text>
            <Text style={styles.statValue}>{bmr ?? 'N/A'}</Text>
            <Text style={styles.statMeta}>Calories at rest</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Goal</Text>
            <Text style={styles.statValue}>{userParams?.activity_level?.replace('_', ' ').charAt(0).toUpperCase() + (userParams?.activity_level?.replace('_', ' ').slice(1) || '')}</Text>
            <Text style={styles.statMeta}>Activity level</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Macro balance</Text>
            <Text style={styles.sectionHint}>Daily targets</Text>
          </View>

          {macroData.map((item) => (
            <View key={item.label} style={styles.macroRow}>
              <View style={styles.macroHead}>
                <View style={[styles.dot, { backgroundColor: item.color }]} />
                <Text style={styles.macroLabel}>{item.label}</Text>
              </View>
              <Text style={styles.macroValue}>{item.value}g</Text>
              <View style={[styles.barTrack, { backgroundColor: item.tint }]}>
                <View style={[styles.barFill, { width: `${Math.min(item.value, 100)}%`, backgroundColor: item.color }]} />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Meal highlights</Text>
            <Text style={styles.sectionHint}>Suggested split</Text>
          </View>
          {mealHighlights.map((meal) => (
            <View key={meal.name} style={styles.mealItem}>
              <View style={styles.mealRow}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealKcal}>{meal.kcal}</Text>
              </View>
              <Text style={styles.mealNote}>{meal.note}</Text>
            </View>
          ))}
        </View>

        <View style={styles.tipCard}>
          <FontAwesome name="lightbulb-o" size={16} color={COLORS.emeraldDeep} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>Tip of the day</Text>
            <Text style={styles.tipText}>Keep protein steady across meals to support fullness and energy throughout the day.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 18 : 12,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  eyebrow: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.emeraldDeep,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  title: {
    fontFamily: FONTS.black,
    fontSize: 28,
    color: COLORS.textMain,
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    maxWidth: 320,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.emeraldLight,
    borderColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.emeraldDeep,
    fontWeight: '800',
  },
  heroCard: {
    backgroundColor: COLORS.emeraldDeep,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  heroLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.emeraldLight,
    letterSpacing: 1.4,
  },
  heroValue: {
    fontFamily: FONTS.black,
    fontSize: 34,
    color: '#FFFFFF',
    letterSpacing: -1,
    marginTop: 6,
  },
  heroUnit: {
    fontSize: 16,
    color: COLORS.emeraldLight,
    fontWeight: '500',
  },
  heroDescription: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flexBasis: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  statLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  statValue: {
    fontFamily: FONTS.black,
    fontSize: 22,
    color: COLORS.textMain,
    marginTop: 4,
    letterSpacing: -0.4,
  },
  statMeta: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.textMain,
  },
  sectionHint: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  macroRow: {
    marginBottom: 10,
  },
  macroHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  macroLabel: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textMain,
  },
  macroValue: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  barTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  mealItem: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginTop: 10,
  },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealName: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.textMain,
  },
  mealKcal: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.emeraldDeep,
  },
  mealNote: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 17,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.emeraldLight,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.18)',
    padding: 14,
  },
  tipTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textMain,
    marginBottom: 2,
  },
  tipText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
});

export default InsightsScreen;