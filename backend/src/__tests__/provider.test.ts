import {
  getPaymentProvider,
  providers,
  AddisPayProvider,
  TelebirrProvider,
  ChapaProvider,
  CbeBirrProvider,
  SandboxPaymentProvider,
} from '../services/provider';

describe('Multi-Gateway Payment Provider Architecture', () => {
  test('provider registry contains all required Ethiopian payment rails', () => {
    expect(providers.ADDISPAY).toBeInstanceOf(AddisPayProvider);
    expect(providers.TELEBIRR).toBeInstanceOf(TelebirrProvider);
    expect(providers.CHAPA).toBeInstanceOf(ChapaProvider);
    expect(providers.CBE_BIRR).toBeInstanceOf(CbeBirrProvider);
    expect(providers.SANDBOX).toBeInstanceOf(SandboxPaymentProvider);
  });

  test('resolves explicit provider when requested', async () => {
    const telebirr = await getPaymentProvider('TELEBIRR');
    expect(telebirr.name).toBe('TELEBIRR');

    const chapa = await getPaymentProvider('CHAPA');
    expect(chapa.name).toBe('CHAPA');

    const addispay = await getPaymentProvider('ADDISPAY');
    expect(addispay.name).toBe('ADDISPAY');

    const cbe = await getPaymentProvider('CBE_BIRR');
    expect(cbe.name).toBe('CBE_BIRR');

    const sandbox = await getPaymentProvider('SANDBOX');
    expect(sandbox.name).toBe('SANDBOX');
  });

  test('TelebirrProvider initiates payment with correct reference and instructions', async () => {
    const provider = new TelebirrProvider();
    const result = await provider.initiatePayment({
      transactionId: 'test-txn-12345678',
      amount: 25,
      currency: 'ETB',
      taxiId: 'TX-1001',
    });

    expect(result.provider).toBe('TELEBIRR');
    expect(result.status).toBe('PENDING');
    expect(result.providerReference).toContain('TLB-');
    expect(result.instructions).toContain('*127#');
    expect(result.checkoutUrl).toBeDefined();
  });

  test('ChapaProvider initiates payment with correct reference and sandbox fallback', async () => {
    const provider = new ChapaProvider();
    const result = await provider.initiatePayment({
      transactionId: 'test-txn-chapa-1234',
      amount: 50,
      currency: 'ETB',
      taxiId: 'TX-1001',
      passengerPhone: '+251911223344',
    });

    expect(result.provider).toBe('CHAPA');
    expect(result.status).toBe('PENDING');
    expect(result.providerReference).toContain('CHP-');
    expect(result.checkoutUrl).toContain('chapa');
  });

  test('CbeBirrProvider initiates USSD instructions (*847#)', async () => {
    const provider = new CbeBirrProvider();
    const result = await provider.initiatePayment({
      transactionId: 'test-txn-cbe-9876',
      amount: 15,
      currency: 'ETB',
      taxiId: 'TX-1001',
    });

    expect(result.provider).toBe('CBE_BIRR');
    expect(result.providerReference).toContain('CBE-');
    expect(result.instructions).toContain('*847#');
  });

  test('SandboxPaymentProvider provides instant 1-click test simulation', async () => {
    const provider = new SandboxPaymentProvider();
    const result = await provider.initiatePayment({
      transactionId: 'test-txn-sbx-4321',
      amount: 10,
      currency: 'ETB',
      taxiId: 'TX-1001',
    });

    expect(result.provider).toBe('SANDBOX');
    expect(result.status).toBe('PENDING');
    expect(result.providerReference).toContain('SBX-');
  });

  test('verifyWebhook validates signatures across providers', () => {
    expect(providers.ADDISPAY.verifyWebhook('sandbox-signature', '{"test":true}')).toBe(true);
    expect(providers.TELEBIRR.verifyWebhook('telebirr-signature', '{"test":true}')).toBe(true);
    expect(providers.CHAPA.verifyWebhook('chapa-signature', '{"test":true}')).toBe(true);
    expect(providers.CBE_BIRR.verifyWebhook('sandbox-signature', '{"test":true}')).toBe(true);
    expect(providers.ADDISPAY.verifyWebhook('bad-sig', '')).toBe(false);
  });
});
