/**
 * LoginScreen.tsx — Email/password login with role-based routing.
 *
 * After login, reads the user's Firestore role document and navigates
 * patients to HomeScreen and clinicians to ClinicianDashboard.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../services/firebase';
import { UserDoc } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Login'>;
};

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = credential.user.uid;

      const userSnap = await getDoc(doc(firestore, 'users', uid));
      if (!userSnap.exists()) {
        Alert.alert('Account not found', 'Your account has no profile. Contact your clinic.');
        setLoading(false);
        return;
      }

      const user = userSnap.data() as UserDoc;

      if (user.role === 'clinician') {
        navigation.replace('ClinicianDashboard', {
          clinicianId: uid,
          patientId: '', // clinician selects patient later; for demo, hardcoded via getPatientTrends
        });
      } else {
        navigation.replace('Home', { userId: uid, userName: user.name });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      Alert.alert('Login failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>CareMind AI</Text>
        <Text style={styles.subtitle}>Cognitive Support Companion</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessible
            accessibilityLabel="Email address"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            accessible
            accessibilityLabel="Password"
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Sign in"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Demo quick-fill buttons */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Demo accounts</Text>
          <View style={styles.demoRow}>
            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => { setEmail('patient@demo.com'); setPassword('demo1234'); }}
            >
              <Text style={styles.demoButtonText}>Patient</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => { setEmail('clinician@demo.com'); setPassword('demo1234'); }}
            >
              <Text style={styles.demoButtonText}>Clinician</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1D4ED8',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  button: {
    backgroundColor: '#1D4ED8',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  demoSection: {
    marginTop: 32,
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 10,
  },
  demoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  demoButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  demoButtonText: {
    fontSize: 14,
    color: '#374151',
  },
});
