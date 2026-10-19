/**
 * After a store purchase, Pro reaches the account through RevenueCat's
 * webhook to the API, usually a second or two after the purchase sheet
 * closes. Reading the account once, straight away, still says FREE, so a
 * rider who just paid saw "Upgrade to Pro". Poll until the server says PRO,
 * or give up after `attempts` reads.
 *
 * Resolves true once the tier is PRO, false if it never was. A failed read
 * counts as "not yet" rather than ending the wait.
 */
export async function waitForPro(
  fetchTier: () => Promise<string | null | undefined>,
  {
    attempts = 10,
    intervalMs = 1500,
    sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  }: { attempts?: number; intervalMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<boolean> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const tier = await fetchTier().catch(() => null);
    if (tier === 'PRO') return true;
    if (attempt < attempts) await sleep(intervalMs);
  }
  return false;
}
