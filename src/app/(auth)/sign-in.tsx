import { FontAwesome } from "@expo/vector-icons";
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { ActivityIndicator, Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSocialAuth from '../../hooks/useSocialAuth';

const { width } = Dimensions.get('window');

// Premium Color Palette
const COLORS = {
  primary: '#0F766E',      
  accent: '#10B981',       
  accentLight: '#D1FAE5',  
  bgSheet: '#F8FAFC',      
  textDark: '#0F172A',     
  textMuted: '#64748B',    
  border: '#E2E8F0',       
  white: '#FFFFFF',
};

// Modern Font Configuration
// Swap 'System' / 'sans-serif' with custom fonts like 'Poppins-Bold' if loaded via expo-font
const FONTS = {
  black: Platform.OS === 'ios' ? 'System' : 'sans-serif-layout',
  bold: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  medium: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  regular: Platform.OS === 'ios' ? 'System' : 'sans-serif',
};

export default function SignInScreen() {
  const { handleSocialAuth, loadingStrategy } = useSocialAuth();
  
  const isGoogleClicked = loadingStrategy === "oauth_google";
  const isGithubClicked = loadingStrategy === "oauth_github";
  const isAppleClicked = loadingStrategy === "oauth_apple"; 
  const isLoading = isAppleClicked || isGithubClicked || isGoogleClicked;

  const floatAnimOne = useSharedValue(0);
  const floatAnimTwo = useSharedValue(0);

  useEffect(() => {
    floatAnimOne.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 3500 }),
        withTiming(12, { duration: 3500 })
      ),
      -1,
      true
    );
    floatAnimTwo.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 4500 }),
        withTiming(-15, { duration: 4500 })
      ),
      -1,
      true
    );
  }, []);

  const animatedOrbOne = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnimOne.value }, { scale: 1.05 }],
  }));

  const animatedOrbTwo = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnimTwo.value }, { translateX: floatAnimTwo.value * 0.3 }],
  }));

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Background Ambient Elements */}
      <Animated.View
        entering={FadeIn.duration(1000)}
        style={[styles.orb, styles.orbOne, animatedOrbOne]}
      />
      <Animated.View
        entering={FadeIn.duration(1000).delay(200)}
        style={[styles.orb, styles.orbTwo, animatedOrbTwo]}
      />

      {/* Top Graphic Branding Block */}
      <View style={styles.brandContainer}>
        <Animated.View entering={FadeInDown.duration(800).delay(100)} style={styles.brandContent}>

          <View>
            <Image  source={require("../../../assets/images/logo6.png")} style = {styles.logoImage} />
          </View>
          
        </Animated.View>
      </View>

      {/* Interactive Authentication Sheet */}
      <Animated.View
        entering={FadeInDown.duration(2000).delay(800)}
        style={styles.sheet}
      >
        <View style={styles.badgeContainer}>
          <View style={styles.pillBadge}>
            <Text style={styles.pillBadgeText}>Welcome Back</Text>
          </View>
        </View>

        <Text style={styles.sheetContextText}>
          Choose your platform to seamlessly jump back into your personalized nutritional experience.
        </Text>

        {/* Buttons Stack */}
        <View style={styles.buttonStack}>
          
          {/* Google */}
          <Animated.View entering={FadeInDown.duration(600).delay(350)}>
            <Pressable
              disabled={isLoading}
              onPress={() => handleSocialAuth("oauth_google")}
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.socialButtonPressed,
                isLoading && styles.socialButtonDisabled
              ]}
            >
              <View style={styles.socialIconWrapper}>
                <Image
                  source={require("../../../assets/images/google.png")}
                  style={styles.googleIconImage}
                />
              </View>
              <Text style={styles.socialButtonText}>
                {isGoogleClicked ? "Connecting account..." : "Continue with Google"}
              </Text>
              {isGoogleClicked ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : (
                <FontAwesome name="arrow-right" size={14} color={COLORS.textMuted} />
              )}
            </Pressable>
          </Animated.View>

          {/* GitHub */}
          <Animated.View entering={FadeInDown.duration(600).delay(450)}>
            <Pressable
              disabled={isLoading}
              onPress={() => handleSocialAuth("oauth_github")}
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.socialButtonPressed,
                isLoading && styles.socialButtonDisabled
              ]}
            >
              <View style={styles.socialIconWrapper}>
                <FontAwesome name="github" size={22} color={COLORS.textDark} />
              </View>
              <Text style={styles.socialButtonText}>
                {isGithubClicked ? "Connecting account..." : "Continue with GitHub"}
              </Text>
              {isGithubClicked ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : (
                <FontAwesome name="arrow-right" size={14} color={COLORS.textMuted} />
              )}
            </Pressable>
          </Animated.View>

          {/* Apple */}
          <Animated.View entering={FadeInDown.duration(600).delay(550)}>
            <Pressable
              disabled={isLoading}
              onPress={() => handleSocialAuth("oauth_apple")}
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.socialButtonPressed,
                isLoading && styles.socialButtonDisabled
              ]}
            >
              <View style={styles.socialIconWrapper}>
                <FontAwesome name="apple" size={22} color={COLORS.textDark} />
              </View>
              <Text style={styles.socialButtonText}>
                {isAppleClicked ? "Connecting account..." : "Continue with Apple"}
              </Text>
              {isAppleClicked ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : (
                <FontAwesome name="arrow-right" size={14} color={COLORS.textMuted} />
              )}
            </Pressable>
          </Animated.View>

        </View>

        {/* Footer Legal Disclaimer */}
        <Text style={styles.footerText}>
          By continuing, you agree to our{' '}
          <Text style={styles.linkText} onPress={() => {}}>Terms of Service</Text> and{' '}
          <Text style={styles.linkText} onPress={() => {}}>Privacy Policy</Text>.
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbOne: {
    top: -50,
    left: -60,
    width: width * 0.6,
    height: width * 0.6,
    backgroundColor: COLORS.white,
    opacity: 0.08,
  },
  orbTwo: {
    top: 140,
    right: -50,
    width: width * 0.75,
    height: width * 0.75,
    backgroundColor: COLORS.accentLight,
    opacity: 0.1,
  },
  brandContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    bottom: 40
  },
  brandContent: {
    alignItems: 'center',
  },
  logoBadge: {
    marginBottom: 16,
    height: 120,
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
 title: {
    fontFamily: Platform.OS === 'ios' ? 'Baskerville-BoldItalic' : 'serif',
    color: COLORS.white,
    fontSize: 50,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FONTS.medium,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    bottom: 134,
    letterSpacing: 0.2,
  },
  sheet: {
    backgroundColor: COLORS.bgSheet,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },
  badgeContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  pillBadge: {
    borderRadius: 100,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  pillBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: COLORS.primary,
  },
  sheetContextText: {
    fontFamily: FONTS.regular,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
    color: COLORS.textMuted,
    paddingHorizontal: 12,
    marginBottom: 28,
  },
  buttonStack: {
    gap: 12,
  },
  socialButton: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  socialButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  socialButtonDisabled: {
    opacity: 0.6,
  },
  socialIconWrapper: {
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconImage: {
    width: 20,
    height: 20,
  },
  logoImage :{
    width: 300,
    height: 300,
    flex: 1,
    left:4,
    top: 20

  },
  socialButtonText: {
    fontFamily: FONTS.bold,
    marginLeft: 14,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  footerText: {
    fontFamily: FONTS.regular,
    textAlign: 'center',
    marginTop: 24,
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  linkText: {
    fontFamily: FONTS.bold,
    color: COLORS.accent,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});