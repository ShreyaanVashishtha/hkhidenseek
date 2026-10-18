/**
 * WebAuthn Passkey Biometrics Authentication for Admin
 * Supports Touch ID, Face ID, Windows Hello, and Android Biometrics
 */

const PASSKEY_CREDENTIAL_STORAGE_KEY = 'mtr_admin_passkey_credential_id';

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Check if the current browser and device support WebAuthn biometrics
 */
export async function isPasskeySupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  if (!window.PublicKeyCredential) {
    return false;
  }

  try {
    if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch (e) {
    console.warn("[Passkey] Biometric support check failed:", e);
  }

  return true;
}

/**
 * Check if an admin passkey has already been registered on this device
 */
export function hasRegisteredAdminPasskey(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem(PASSKEY_CREDENTIAL_STORAGE_KEY));
}

/**
 * Register a new biometric passkey on this device for the Admin
 */
export async function registerAdminPasskey(adminName: string = 'Game Master / Referee'): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { success: false, error: 'WebAuthn is not supported on this browser or device.' };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const creationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'HK MTR Hide & Seek',
        id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
      },
      user: {
        id: userId,
        name: 'admin@hkhidenseek.local',
        displayName: adminName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' },  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Built-in Face ID / Touch ID / Windows Hello
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    };

    const credential = (await navigator.credentials.create({
      publicKey: creationOptions,
    })) as PublicKeyCredential;

    if (!credential || !credential.rawId) {
      return { success: false, error: 'Passkey registration cancelled by user.' };
    }

    const credentialIdBase64 = bufferToBase64(credential.rawId);
    localStorage.setItem(PASSKEY_CREDENTIAL_STORAGE_KEY, credentialIdBase64);

    return {
      success: true,
      message: 'Biometric passkey registered successfully! You can now log in with Touch ID / Face ID.',
    };
  } catch (err: any) {
    console.error('[Passkey] Registration failed:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Passkey registration prompt was dismissed or cancelled.' };
    }
    return { success: false, error: err.message || 'Passkey registration failed.' };
  }
}

/**
 * Authenticate the admin using Face ID / Touch ID passkey
 */
export async function authenticateAdminWithPasskey(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { success: false, error: 'WebAuthn is not supported on this device.' };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const savedCredId = localStorage.getItem(PASSKEY_CREDENTIAL_STORAGE_KEY);
    const allowCredentials: PublicKeyCredentialDescriptor[] = savedCredId
      ? [
          {
            id: base64ToBuffer(savedCredId),
            type: 'public-key',
            transports: ['internal'],
          },
        ]
      : [];

    const requestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      timeout: 60000,
      userVerification: 'required',
      ...(allowCredentials.length > 0 ? { allowCredentials } : {}),
      rpId: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
    };

    const assertion = (await navigator.credentials.get({
      publicKey: requestOptions,
    })) as PublicKeyCredential;

    if (!assertion || !assertion.id) {
      return { success: false, error: 'Biometric authentication was cancelled.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Passkey] Authentication failed:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Biometric scan was cancelled or timed out.' };
    }
    return { success: false, error: err.message || 'Biometric authentication failed.' };
  }
}

/**
 * Remove stored passkey from this device
 */
export function removeAdminPasskey(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PASSKEY_CREDENTIAL_STORAGE_KEY);
  }
}
