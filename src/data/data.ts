import { AnimationObject } from 'lottie-react-native';

export interface OnboardingData {
  id: number;
  animation: AnimationObject;
  text: string;
  textColor: string;
  backgroundColor: string;
}

const data: OnboardingData[] = [
  {
    id: 1,
    animation: require('../animations/Lottie9.json'),
    text: 'Welcome To EatRight',
    textColor: '#059669', // Emerald Green
    backgroundColor: '#FFFFFF', // Pure White
  },
  {
    id: 2,
    animation: require('../animations/Lottie6.json'),
    text: 'Plan Your Meals With Ease',
    textColor: '#064E3B', // Deep Forest Green (for contrast)
    backgroundColor: '#ECFDF5', // Soft Mint/Light Emerald
  },
  {
    id: 3,
    animation: require('../animations/Lottie8.json'),
    text: 'And Track Your Progress',
    textColor: '#059669', // Deep Forest Green (for contrast)
    backgroundColor: '#FFFFFF', // Pure White
  },
];

export default data;