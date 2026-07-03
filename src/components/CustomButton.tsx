import { router } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, TouchableWithoutFeedback, useWindowDimensions } from 'react-native';
import Animated, { AnimatedRef, interpolateColor, SharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { OnboardingData } from '../data/data';

type Props = {
    dataLength: number;
    flatlistIndex: SharedValue<number>;
    flatlistRef: AnimatedRef<FlatList<OnboardingData>>
    x: SharedValue<number>;
};
const CustomButton = ({dataLength, flatlistIndex, flatlistRef, x}: Props) => {
    const {width : SCREEN_WIDTH} =  useWindowDimensions();

    const buttonAnimationStyle = useAnimatedStyle(() => {
        return {
            width: flatlistIndex.value === dataLength - 1
            ? withSpring (140)
            : withSpring(60),
        }
    })

    const arrowAnimationStyle = useAnimatedStyle(() => {

        return {
            width: 30, 
            height: 30, 
            opacity : flatlistIndex.value === dataLength - 1 ?withTiming(0): withTiming(1),
            transform: [
                {
                    translateX: flatlistIndex.value === dataLength - 1 
                    ? withTiming(50) 
                    : withTiming(0)
                }
            ]
        }
    })

    const textAnimationStyle = useAnimatedStyle(() => {
        return {
            opacity: flatlistIndex.value === dataLength - 1 ? 
            withTiming(1) : withTiming(0),
            transform: [{
                translateX: flatlistIndex.value === dataLength - 1
                ? withTiming(0) : withTiming(-100)
            }]
        }
            
        
})

    const animatedColor = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            x.value,
            [0, SCREEN_WIDTH, 2 * SCREEN_WIDTH],
            ['#059669', '#064E3B', '#059669']
        )
        
        return {
            backgroundColor : backgroundColor
        }

    })
  return (
    <TouchableWithoutFeedback 
        onPress={() => {
            if (flatlistIndex.value < dataLength - 1){
                flatlistRef.current?.scrollToIndex({index: flatlistIndex.value + 1});
            }else {
                router.replace('/(tabs)/home');
            }
        }}>
        
        <Animated.View style={[styles.container, animatedColor, buttonAnimationStyle]}>
            <Animated.Text style ={[styles.buttonText, textAnimationStyle]}> Get Started!</Animated.Text>
            <Animated.Image source ={require('../assets/ArrowIcon.png')}
                style={[styles.arrowIcon, arrowAnimationStyle]}
             />
        </Animated.View>
    </TouchableWithoutFeedback>
    
    
  )
}

export default CustomButton

const styles = StyleSheet.create({
    arrowIcon: {
        position: 'absolute',
        width: 30,
        height: 30,

    },
    container: {
        backgroundColor: 'black',
        padding: 10,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        width: 60,
        height: 60,
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
        position: 'absolute',
        
    }
})