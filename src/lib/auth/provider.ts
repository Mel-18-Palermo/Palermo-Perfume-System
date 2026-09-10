export type ProviderIdentity = Readonly<{ id: string; email: string; verified: boolean }>;
export type RecoveryGrant = Readonly<{
  identity: ProviderIdentity;
  changePassword: (password: string) => Promise<void>;
  dispose: () => Promise<void>;
}>;

/** Provider secrets and access/refresh tokens never cross this server boundary. */
export interface IdentityProvider {
  register(input: { name: string; email: string; password: string }): Promise<ProviderIdentity>;
  verify(token: string): Promise<ProviderIdentity>;
  login(email: string, password: string): Promise<ProviderIdentity>;
  requestPasswordReset(email: string): Promise<void>;
  recover(token: string): Promise<RecoveryGrant>;
}
