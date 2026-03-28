/**
 * AppNavigator.tsx — Stack-based navigation with role-based routing.
 *
 * Route flow:
 *   Login → Home (patient) or ClinicianDashboard (clinician)
 *   Home → Question → Result → Home (loop)
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { QuestionScreen } from '../screens/QuestionScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { ClinicianDashboard } from '../screens/ClinicianDashboard';

export type RootStackParamList = {
  Login: undefined;
  Home: { userId: string; userName: string };
  Question: undefined;
  Result: undefined;
  ClinicianDashboard: { clinicianId: string; patientId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#1D4ED8',
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'CareMind', headerLeft: () => null }}
        />
        <Stack.Screen
          name="Question"
          component={QuestionScreen}
          options={{ title: 'Exercise Session', headerLeft: () => null }}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{ title: 'Session Complete', headerLeft: () => null }}
        />
        <Stack.Screen
          name="ClinicianDashboard"
          component={ClinicianDashboard}
          options={{ title: 'Dashboard', headerLeft: () => null }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
