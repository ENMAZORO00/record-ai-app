import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import AuthLayout from "../components/AuthLayout";
import AuthInput from "../components/AuthInput";
import AuthButton from "../components/AuthButton";
import GoogleLoginButton from "../components/GoogleLoginButton";
import GoogleAuthSafe from "../components/GoogleAuthSafe";
import { authApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { authColors } from "../theme/authColors";
import { GOOGLE_WEB_CLIENT_ID } from "../constants/config";

export default function LoginScreen({ navigation, route }) {
  const inviteToken = route?.params?.inviteToken;
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const goAfterAuth = () => {
    if (inviteToken) {
      navigation.reset({
        index: 0,
        routes: [{ name: "AcceptInvite", params: { inviteToken } }],
      });
    } else {
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    }
  };

  const handleGoogleSuccess = (user, token) => {
    signIn(user, token);
    goAfterAuth();
  };

  const handleLogin = async () => {
    setError("");
    const tEmail = email.trim().toLowerCase();
    if (!tEmail) {
      setError("Please enter your email");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.login(tEmail, password);
      await signIn(data.user, data.token);
      goAfterAuth();
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      titleFontWeight="700"
      titleBottomMargin={32}
    >
      <AuthInput
        label="Email Address"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          setError("");
        }}
        placeholder="Email Address"
        keyboardType="email-address"
        leftIcon="mail-outline"
      />
      <AuthInput
        label="Password"
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          setError("");
        }}
        placeholder="Password"
        secureTextEntry
        leftIcon="lock-closed-outline"
      />

      <TouchableOpacity
        style={styles.forgotLink}
        onPress={() => navigation.navigate("ForgotPassword")}
        disabled={loading}
      >
        <Text style={styles.forgotText}>Forgot password?</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <AuthButton
        title="Log in"
        onPress={handleLogin}
        loading={loading}
        primaryStyle="solid"
      />

      {GOOGLE_WEB_CLIENT_ID ? (
        <GoogleAuthSafe>
          <GoogleLoginButton onSuccess={handleGoogleSuccess} onError={setError} />
        </GoogleAuthSafe>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity
          onPress={() =>
            navigation.replace(
              "SignUp",
              inviteToken ? { inviteToken } : undefined,
            )
          }
        >
          <Text style={styles.link}>Sign Up</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.registerCompanyWrap}
        onPress={() =>
          navigation.navigate("RegisterCompany", { fromLogin: true })
        }
        disabled={loading}
      >
        <Text style={styles.registerCompanyText}>Register your company</Text>
        <Text style={styles.registerCompanySubtext}>
          Create account as company admin and add your team
        </Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgotLink: { alignSelf: "flex-end", marginBottom: 20 },
  forgotText: {
    fontSize: 15,
    color: authColors.textPrimary,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 14,
    color: authColors.textSecondary,
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
    paddingVertical: 12,
  },
  footerText: { fontSize: 15, color: authColors.textSecondary },
  link: { fontSize: 15, fontWeight: "600", color: authColors.textPrimary },
  registerCompanyWrap: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(88, 16, 250, 0.35)",
    borderRadius: 12,
    backgroundColor: "rgba(88, 16, 250, 0.06)",
  },
  registerCompanyText: {
    fontSize: 15,
    fontWeight: "600",
    color: authColors.primary,
  },
  registerCompanySubtext: {
    fontSize: 12,
    color: authColors.textMuted,
    marginTop: 4,
  },
  legal: {
    fontSize: 13,
    color: authColors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  legalLink: {
    color: authColors.textPrimary,
    fontWeight: "500",
  },
});
