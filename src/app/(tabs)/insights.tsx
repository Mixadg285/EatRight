import { useClerk, useUser } from '@clerk/expo';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G } from 'react-native-svg';
import { useMealPlan } from '../../contexts/MealPlanContext';

const PROFILE_BACKEND_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://172.20.10.10:5000';

const COLORS = {
  bg: '#F4F7F6',
  card: '#FFFFFF',
  textMain: '#111827',
  textMuted: '#6B7280',
  emerald: '#10B981',
  emeraldDeep: '#047857',
  emeraldLight: '#ECFDF5',
  border: '#E5E7EB',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  warning: '#F59E0B',
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
  if (gender.toLowerCase() === 'male') {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
  } else {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
  }
};

const formatText = (text: string) => {
  if (!text) return 'N/A';
  return text.replace(/_/g, ' ').charAt(0).toUpperCase() + text.replace(/_/g, ' ').slice(1);
};

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const buildWeeklyActivityData = (baseTarget: number, activityLevel?: string) => {
  const normalizedActivityLevel = (activityLevel || 'moderate').toLowerCase();
  const activityMultiplier: Record<string, number> = {
    sedentary: 0.92,
    lightly_active: 1.0,
    moderate: 1.08,
    active: 1.16,
    very_active: 1.24,
  };

  const target = Math.max(1800, Math.round(baseTarget * (activityMultiplier[normalizedActivityLevel] || 1.08)));
  const pattern = [0.9, 1.02, 0.95, 1.12, 0.98, 1.18, 0.94];

  return WEEK_DAYS.map((day, index) => ({
    day,
    target,
    calories: Math.round(target * pattern[index] + (index === 3 ? 60 : 0)),
  }));
};

const InsightsScreen = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const { calories: predictedCalories, mealPlan } = useMealPlan();

  const handleUpdateProfilePicture = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your photos to update your avatar.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.2,
        base64: true,
      });

      if (result.canceled || !result.assets[0].base64) {
        return; 
      }

      setIsUploadingImage(true);

      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      
      await user?.setProfileImage({
        file: base64Image,
      });

    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Failed', 'There was an error updating your profile picture.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  useEffect(() => {
    const loadSavedProfile = async () => {
      if (!user?.primaryEmailAddress?.emailAddress) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${PROFILE_BACKEND_URL}/api/user-profile/${user.primaryEmailAddress.emailAddress}`);
        const result = await response.json();

        if (response.ok && result?.success && result?.exists) {
          setProfileData(result.data);
        }
      } catch (error) {
        console.error('Error loading saved profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedProfile();
  }, [user?.primaryEmailAddress?.emailAddress]);

  const bmi = useMemo(() => {
    if (!profileData?.weight_kg || !profileData?.height_cm) return null;
    return calculateBMI(Number(profileData.weight_kg), Number(profileData.height_cm));
  }, [profileData]);

  const bmr = useMemo(() => {
    if (!profileData) return null;
    return calculateBMR(
      Number(profileData.weight_kg),
      Number(profileData.height_cm),
      Number(profileData.age),
      profileData.gender
    );
  }, [profileData]);

  const getBMIStatus = (bmi: number | null) => {
    if (!bmi) return 'Unknown';
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal range';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  const predictedCaloriesRounded = predictedCalories != null ? Math.ceil(predictedCalories) : null;

  const macroTotals = useMemo(() => {
    const sections = Object.values(mealPlan || {});
    const macros = sections.flatMap((section: any) => (Array.isArray(section) ? section : []));

    const totals = macros.reduce(
      (acc: { protein: number; carbs: number; fats: number }, item: any) => ({
        protein: acc.protein + Number(item?.Protein ?? 0),
        carbs: acc.carbs + Number(item?.Carbohydrates ?? item?.Carbs ?? 0),
        fats: acc.fats + Number(item?.Fats ?? 0),
      }),
      { protein: 0, carbs: 0, fats: 0 }
    );

    const total = totals.protein + totals.carbs + totals.fats;
    return {
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fats: Math.round(totals.fats * 10) / 10,
      total: Math.round(total * 10) / 10,
    };
  }, [mealPlan]);

  const macroSegments = useMemo(() => {
    const base = macroTotals.total || 1;
    return [
      { label: 'Protein', value: macroTotals.protein, color: '#2563EB' },
      { label: 'Carbs', value: macroTotals.carbs, color: '#EA580C' },
      { label: 'Fats', value: macroTotals.fats, color: '#C084FC' },
    ].map((segment) => ({
      ...segment,
      percentage: (segment.value / base) * 100,
    }));
  }, [macroTotals]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/(auth)/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Sign out failed', 'Please try again.');
    }
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={handleUpdateProfilePicture}
            disabled={isUploadingImage}
          >
            {user?.imageUrl ? (
              <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <FontAwesome name="user" size={32} color="#047857" />
              </View>
            )}
            
            {isUploadingImage && (
              <View style={styles.avatarLoadingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}

            <View style={styles.editBadge}>
              <FontAwesome name="camera" size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          
          <Text style={styles.userName}>{user?.fullName || 'User Profile'}</Text>
          <Text style={styles.userEmail}>{user?.primaryEmailAddress?.emailAddress}</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.emeraldDeep} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Main Goal Hero Card */}
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>CURRENT GOAL</Text>
              <Text style={styles.heroValue}>{formatText(profileData?.weight_goal || 'Maintain Weight')}</Text>
              <Text style={styles.heroDescription}>
                Based on your preference, we tailor your daily calories and meal suggestions to help you achieve this.
              </Text>
            </View>

            {/* Health Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Weight</Text>
                <Text style={styles.statValue}>{profileData?.weight_kg ?? '--'}<Text style={styles.statUnit}> kg</Text></Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Height</Text>
                <Text style={styles.statValue}>{profileData?.height_cm ?? '--'}<Text style={styles.statUnit}> cm</Text></Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>BMI</Text>
                <Text style={styles.statValue}>{bmi ?? '--'}</Text>
                <Text style={styles.statMeta}>{bmi ? getBMIStatus(bmi) : 'No data'}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Daily Calorie Target</Text>
                <Text style={styles.statValue}>{predictedCaloriesRounded ?? '--'}</Text>
                
              </View>
            </View>
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Daily Macronutrients</Text>
                  <Text style={styles.sectionSubtitle}>Protein, Carbs, and Fat distribution</Text>
                </View>
                <FontAwesome name="pie-chart" size={16} color={COLORS.emeraldDeep} />
              </View>

              <View style={styles.macroChartWrapper}>
                <View style={styles.macroChartContainer}>
                  <Svg width={180} height={180} viewBox="0 0 180 180">
                    <G rotation="-90" origin="90, 90">
                      {(() => {
                        let accumulatedOffset = 0;
                        return macroSegments.map((segment) => {
                          const radius = 60;
                          const circumference = 2 * Math.PI * radius;
                          const length = (segment.percentage / 100) * circumference;
                          const circle = (
                            <Circle
                              key={segment.label}
                              cx="90"
                              cy="90"
                              r={radius}
                              fill="none"
                              stroke={segment.color}
                              strokeWidth="24"
                              strokeLinecap="round"
                              strokeDasharray={`${length} ${circumference}`}
                              strokeDashoffset={-accumulatedOffset}
                            />
                          );
                          accumulatedOffset += length;
                          return circle;
                        });
                      })()}
                    </G>
                  </Svg>

                  <View style={styles.macroCenterLabel}>
                    <Text style={styles.macroCenterValue}>{macroTotals.total.toFixed(0)}</Text>
                    <Text style={styles.macroCenterUnit}>g macros</Text>
                  </View>
                </View>

                <View style={styles.macroLegend}>
                  <View style={styles.macroLegendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
                    <Text style={styles.legendText}>Protein {macroTotals.protein.toFixed(1)}g</Text>
                  </View>
                  <View style={styles.macroLegendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#EA580C' }]} />
                    <Text style={styles.legendText}>Carbs {macroTotals.carbs.toFixed(1)}g</Text>
                  </View>
                  <View style={styles.macroLegendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#C084FC' }]} />
                    <Text style={styles.legendText}>Fats {macroTotals.fats.toFixed(1)}g</Text>
                  </View>

                </View>
              </View>
            </View>
            {/* Preferences Details Card */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Diet & Lifestyle</Text>
                <FontAwesome name="sliders" size={16} color={COLORS.textMuted} />
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Activity Level</Text>
                <Text style={styles.detailValue}>{formatText(profileData?.activity_level)}</Text>
              </View>
              <View style={styles.divider} />
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Dietary Preference</Text>
                <Text style={styles.detailValue}>{formatText(profileData?.dietary_preference)}</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Prefer Local Food</Text>
                <Text style={styles.detailValue}>{profileData?.prefer_local_food ? 'Yes' : 'No'}</Text>
              </View>
            </View>
            


           
          </>
        )}
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
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 12,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.card,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.emeraldLight,
  },
  userName: {
    fontFamily: FONTS.black,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  userEmail: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
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
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 6,
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
  statUnit: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
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
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textMain,
  },
  sectionSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  detailValue: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.textMain,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
  
  // Chart Styles
  chartSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  chartSummaryText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  macroChartWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 4,
  },
  macroChartContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroCenterLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroCenterValue: {
    fontFamily: FONTS.black,
    fontSize: 22,
    color: COLORS.textMain,
  },
  macroCenterUnit: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  macroLegend: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  macroLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barColumn: {
    alignItems: 'center',
    width: 30,
  },
  barTrack: {
    width: 14,
    height: 110,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'flex-end',
    position: 'relative',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
    minHeight: 6,
  },
  targetLine: {
    position: 'absolute',
    width: 24,
    height: 2,
    backgroundColor: COLORS.textMuted,
    left: -5,
    zIndex: 10,
    borderRadius: 1,
  },
  barLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  barValue: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.textMain,
    marginTop: 2,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLine: {
    width: 12,
    height: 2,
    backgroundColor: COLORS.textMuted,
  },
  legendText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
  },

  // Auth and Overlay Styles
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.dangerLight,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginBottom: 20,
  },
  signOutText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.danger,
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#047857',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

export default InsightsScreen;