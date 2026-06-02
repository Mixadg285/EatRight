import { useAuth } from '@clerk/expo';
import { Redirect } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';
import { MealPlanProvider } from '../../contexts/MealPlanContext';


export default function TabsLayout() {
  const { isSignedIn, isLoaded } = useAuth()
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const tabTintColor = isDark ? "hsl(142 70% 54%)" : "hsl(147 75% 33%)";

  if (!isLoaded) {
    return null
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />
  }

  return (
    <MealPlanProvider>
      <NativeTabs tintColor = {tabTintColor}>
          <NativeTabs.Trigger name="index">
          <Label>Home</Label>
          <Icon 
          sf={{
            default: "house",
            selected: "house.fill"

          }} drawable="home" />
          </NativeTabs.Trigger>

         <NativeTabs.Trigger name="planner">
          <Icon sf={{ 
            default: "l.joystick",
            selected: "l.joystick.fill"
          }} 
          drawable="add" />
          <Label>Planner</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="insights">
          <Icon sf={{
            default: "chart.bar",
            selected: "chart.bar.fill"
          }} drawable="add" />
          <Label>Insights</Label>
        </NativeTabs.Trigger>

      </NativeTabs>
    </MealPlanProvider>
  )
}