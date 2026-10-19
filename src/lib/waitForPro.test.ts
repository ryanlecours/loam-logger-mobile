import { waitForPro } from './waitForPro';

const noSleep = jest.fn(() => Promise.resolve());

beforeEach(() => noSleep.mockClear());

describe('waitForPro', () => {
  it('resolves true as soon as the server says PRO', async () => {
    const fetchTier = jest
      .fn()
      .mockResolvedValueOnce('FREE')
      .mockResolvedValueOnce('FREE')
      .mockResolvedValueOnce('PRO');

    await expect(waitForPro(fetchTier, { sleep: noSleep })).resolves.toBe(true);
    expect(fetchTier).toHaveBeenCalledTimes(3);
    expect(noSleep).toHaveBeenCalledTimes(2);
  });

  it('resolves false after the last attempt without a trailing wait', async () => {
    const fetchTier = jest.fn().mockResolvedValue('FREE');

    await expect(waitForPro(fetchTier, { attempts: 4, sleep: noSleep })).resolves.toBe(false);
    expect(fetchTier).toHaveBeenCalledTimes(4);
    expect(noSleep).toHaveBeenCalledTimes(3);
  });

  it('treats a failed read as not yet and keeps waiting', async () => {
    const fetchTier = jest
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce('PRO');

    await expect(waitForPro(fetchTier, { sleep: noSleep })).resolves.toBe(true);
    expect(fetchTier).toHaveBeenCalledTimes(2);
  });

  it('waits the given interval between reads', async () => {
    const fetchTier = jest.fn().mockResolvedValueOnce('FREE').mockResolvedValueOnce('PRO');

    await waitForPro(fetchTier, { intervalMs: 2000, sleep: noSleep });
    expect(noSleep).toHaveBeenCalledWith(2000);
  });
});
