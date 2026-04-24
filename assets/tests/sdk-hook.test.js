import StreamConnect from '../sdk-hook/entries/sdk-hook';

describe('StreamConnect.beginFixCredentials', () => {
  it('throws when no connectAccessToken was provided at construction', () => {
    const sc = new StreamConnect({ apiToken: 'token' });
    expect(() => sc.beginFixCredentials()).toThrow(
      /connect access token/i
    );
  });

  it('transitions to fix-credentials step when a connectAccessToken is present', () => {
    const sc = new StreamConnect({
      apiToken: 'token',
      connectAccessToken: 'connect-token'
    });
    const state = sc.beginFixCredentials();
    expect(state.step).toBe('fix-credentials');
  });
});
