import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

interface Props {
  onSuccess: (
    identityToken: string,
    user?: { email?: string; name?: { firstName?: string; lastName?: string } }
  ) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

/**
 * Apple Sign-In button. Platform-gated: iOS only, since Apple Sign-In isn't
 * available on Android in a native way. Uses Apple's native button component
 * to stay compliant with Apple's Human Interface Guidelines (App Store will
 * reject an app that uses a custom-styled Apple Sign-In button).
 */
export function AppleSignInButton({ onSuccess, onError, disabled }: Props) {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setIsAvailable)
      .catch(() => setIsAvailable(false));
  }, []);

  if (Platform.OS !== 'ios' || !isAvailable) {
    return null;
  }

  async function handlePress() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        onError('Apple Sign-In did not return an identity token.');
        return;
      }

      // email + fullName are only populated on the FIRST sign-in per user;
      // subsequent sign-ins return null for these fields (Apple design).
      // The backend handles that — it persists them on first use.
      const user =
        credential.email || credential.fullName
          ? {
              email: credential.email ?? undefined,
              name:
                credential.fullName &&
                (credential.fullName.givenName || credential.fullName.familyName)
                  ? {
                      firstName: credential.fullName.givenName ?? undefined,
                      lastName: credential.fullName.familyName ?? undefined,
                    }
                  : undefined,
            }
          : undefined;

      onSuccess(credential.identityToken, user);
    } catch (error: unknown) {
      const typedError = error as { code?: string; message?: string };
      // ERR_REQUEST_CANCELED fires when the user dismisses the sheet; silent.
      if (typedError.code === 'ERR_REQUEST_CANCELED') return;
      onError(typedError.message || 'Apple Sign-In failed');
    }
  }

  return (
    <View style={[styles.wrapper, disabled && styles.disabled]} pointerEvents={disabled ? 'none' : 'auto'}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={8}
        style={styles.button}
        onPress={handlePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  button: {
    width: '100%',
    height: 52, // matches GoogleSignInButton padding (16 * 2 + text line) roughly
  },
});
