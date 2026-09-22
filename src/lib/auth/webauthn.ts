import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";

/** A ceremony is deliberately brief: browsers normally time out at the same interval. */
export const WEBAUTHN_CHALLENGE_SECONDS = 5 * 60;

export type WebAuthnConfig = Readonly<{ rpID: string; origin: string }>;

export type WebAuthnVerifier = Readonly<{
  registration(response: RegistrationResponseJSON, expected: WebAuthnConfig & { challenge: string }): Promise<{
    verified: boolean;
    credential: { id: string; publicKey: Uint8Array; counter: number; transports?: string[] } | undefined;
    credentialDeviceType: string | undefined;
    credentialBackedUp: boolean | undefined;
  }>;
  authentication(response: AuthenticationResponseJSON, credential: { id: string; publicKey: Uint8Array; counter: number; transports: string[] }, expected: WebAuthnConfig & { challenge: string }): Promise<{
    verified: boolean; newCounter: number | undefined; credentialDeviceType: string | undefined; credentialBackedUp: boolean | undefined;
  }>;
}>;

export async function defaultWebAuthnVerifier(): Promise<WebAuthnVerifier> {
  const { verifyAuthenticationResponse, verifyRegistrationResponse } = await import("@simplewebauthn/server");
  return {
    async registration(response, expected) {
      const result = await verifyRegistrationResponse({ response, expectedChallenge: expected.challenge, expectedOrigin: expected.origin, expectedRPID: expected.rpID, requireUserVerification: true });
      const info = result.registrationInfo;
      return { verified: result.verified, credential: info ? { ...info.credential, publicKey: new Uint8Array(info.credential.publicKey) } : undefined, credentialDeviceType: info?.credentialDeviceType, credentialBackedUp: info?.credentialBackedUp };
    },
    async authentication(response, credential, expected) {
      const result = await verifyAuthenticationResponse({ response, expectedChallenge: expected.challenge, expectedOrigin: expected.origin, expectedRPID: expected.rpID, requireUserVerification: true, credential: { ...credential, publicKey: new Uint8Array(credential.publicKey) } });
      return { verified: result.verified, newCounter: result.authenticationInfo?.newCounter, credentialDeviceType: result.authenticationInfo?.credentialDeviceType, credentialBackedUp: result.authenticationInfo?.credentialBackedUp };
    },
  };
}
