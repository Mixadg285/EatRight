import React, { createContext, useContext, useState } from 'react';

type MealPlanContextType = {
  mealPlan: any;
  calories: number | null;
  userParams: {
    age: number;
    gender: string;
    height_cm: number;
    weight_kg: number;
    activity_level: string;
    dietary_preference: string;
    weight_goal: string;
    prefer_local_food: boolean;
  } | null;
  setMealPlanData: (mealPlan: any, calories: number | null, userParams: any) => void;
};

const MealPlanContext = createContext<MealPlanContextType | undefined>(undefined);

export const MealPlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mealPlan, setMealPlan] = useState<any>({});
  const [calories, setCalories] = useState<number | null>(null);
  const [userParams, setUserParams] = useState<any>(null);

  const setMealPlanData = (newMealPlan: any, newCalories: number | null, newUserParams: any) => {
    setMealPlan(newMealPlan);
    setCalories(newCalories);
    setUserParams(newUserParams);
  };

  return (
    <MealPlanContext.Provider value={{ mealPlan, calories, userParams, setMealPlanData }}>
      {children}
    </MealPlanContext.Provider>
  );
};

export const useMealPlan = () => {
  const context = useContext(MealPlanContext);
  if (!context) {
    throw new Error('useMealPlan must be used within MealPlanProvider');
  }
  return context;
};
