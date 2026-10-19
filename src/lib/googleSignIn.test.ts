import { signInWithAccountPicker } from './googleSignIn';

function fakeGoogle({
  previous = false,
  response = { type: 'success', data: { idToken: 'id-token' } } as unknown,
} = {}) {
  const calls: string[] = [];
  const google = {
    hasPlayServices: jest.fn(async () => {
      calls.push('hasPlayServices');
      return true;
    }),
    hasPreviousSignIn: jest.fn(() => previous),
    signOut: jest.fn(async () => {
      calls.push('signOut');
      return null;
    }),
    signIn: jest.fn(async () => {
      calls.push('signIn');
      return response;
    }),
  };
  return { google: google as never, mocks: google, calls };
}

describe('signInWithAccountPicker', () => {
  it('forgets the last Google account before signing in, so the picker shows again', async () => {
    const { google, calls } = fakeGoogle({ previous: true });

    await expect(signInWithAccountPicker(google)).resolves.toEqual({
      kind: 'success',
      idToken: 'id-token',
    });
    expect(calls).toEqual(['hasPlayServices', 'signOut', 'signIn']);
  });

  it('skips the sign-out when no account is remembered', async () => {
    const { google, mocks } = fakeGoogle({ previous: false });

    await signInWithAccountPicker(google);
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.signIn).toHaveBeenCalledTimes(1);
  });

  it('reports backing out of the picker as a cancel, not an error', async () => {
    const { google } = fakeGoogle({ response: { type: 'cancelled', data: null } });

    await expect(signInWithAccountPicker(google)).resolves.toEqual({ kind: 'cancelled' });
  });

  it('fails when Google returns no ID token', async () => {
    const { google } = fakeGoogle({ response: { type: 'success', data: { idToken: null } } });

    await expect(signInWithAccountPicker(google)).rejects.toThrow('No ID token received from Google');
  });

  it('lets a Play services failure through to the caller', async () => {
    const { google, mocks } = fakeGoogle();
    mocks.hasPlayServices.mockRejectedValueOnce(Object.assign(new Error('no play'), { code: 'PLAY_SERVICES_NOT_AVAILABLE' }));

    await expect(signInWithAccountPicker(google)).rejects.toMatchObject({ code: 'PLAY_SERVICES_NOT_AVAILABLE' });
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
});
