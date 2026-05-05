import { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { RideShareCard, type RideShareCardProps } from '../components/share/RideShareCard';
import { ShareRideSheet } from '../components/share/ShareRideSheet';

/**
 * Hook that owns the full share UX:
 *
 *   1. Consumer calls `openShareSheet(snapshot)` with the available
 *      formatted values (any unavailable field passed as null).
 *   2. `<ShareSurface />` renders a `ShareRideSheet` modal that lets the
 *      user pick which fields to include and previews the result.
 *   3. On confirm, the off-screen `RideShareCard` is updated with only
 *      the user's selected fields, captured as a transparent PNG via
 *      `react-native-view-shot`, and handed to the OS share sheet via
 *      `expo-sharing`.
 *
 * Usage:
 *
 *   const { openShareSheet, ShareSurface } = useShareRideOverlay();
 *   ...
 *   <Button onPress={() => openShareSheet({ distance, elevation, duration, averageHr })} />
 *   <ShareSurface />
 *
 * `ShareSurface` MUST be rendered somewhere in the screen tree — it
 * carries both the customization sheet and the off-screen capture mount.
 */
export function useShareRideOverlay() {
  const cardRef = useRef<View>(null);

  // The full set of values offered to the user (with nulls for missing
  // data) — used by the sheet to build its toggle list and preview.
  const [snapshotValues, setSnapshotValues] = useState<RideShareCardProps | null>(null);

  // The user-confirmed selection that actually gets captured. Distinct
  // from snapshotValues so the off-screen card only renders the chosen
  // fields, not the full set.
  const [captureValues, setCaptureValues] = useState<RideShareCardProps | null>(null);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [sharing, setSharing] = useState(false);

  const openShareSheet = useCallback((snapshot: RideShareCardProps) => {
    setSnapshotValues(snapshot);
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    if (sharing) return; // disallow dismiss mid-capture
    setSheetVisible(false);
  }, [sharing]);

  const handleConfirm = useCallback(
    async (selectedValues: RideShareCardProps) => {
      setSharing(true);
      // Push the user's selection into the off-screen card so it
      // re-renders with only the chosen fields.
      setCaptureValues(selectedValues);

      try {
        // Wait one frame so React commits the new card props before we
        // snapshot. Without this, captureRef can race and grab the prior
        // render — most visible the second time you share with different
        // selections from the same screen.
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );

        const uri = await captureRef(cardRef, {
          format: 'png',
          // Transparent background preserved through the alpha channel —
          // load-bearing for the "drop onto Instagram story" use case.
          // Hex with full alpha would burn the bg into the PNG.
          result: 'tmpfile',
          quality: 1,
        });

        const sharingAvailable = await Sharing.isAvailableAsync();
        if (!sharingAvailable) {
          Alert.alert(
            'Sharing not available',
            'Sharing isn’t supported on this device.',
          );
          return;
        }

        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share ride overlay',
          UTI: 'public.png',
        });

        // Close the customization sheet only on a successful hand-off
        // to the OS share sheet. If capture or share fails, leave the
        // sheet open so the user can retry without re-opening.
        setSheetVisible(false);
      } catch (err) {
        // User-cancellation on iOS surfaces here as a generic error.
        // Don't alert — silent dismiss is the right UX. Still log so a
        // real failure mode (permissions, view-shot native crash)
        // leaves a breadcrumb.
        console.warn('[useShareRideOverlay] share failed', err);
      } finally {
        setSharing(false);
      }
    },
    [],
  );

  // Returned as a JSX VALUE (rendered with `{shareSurface}`), not a
  // component (rendered with `<ShareSurface />`). The earlier shape
  // wrapped this in `useCallback` and consumed it as `<ShareSurface />`
  // — every state change here returned a new function reference, and
  // because React keys component subtrees by their function-as-type
  // identity, a fresh function unmounted and remounted the entire
  // subtree on every render. That destroyed the off-screen RideShareCard
  // mid-capture: cardRef would briefly point at a torn-down native view,
  // captureRef could fire before the remount committed, and the
  // resulting PNG could be empty / stale / pointing at a freed view.
  //
  // Returning JSX directly lets React reconcile by element type +
  // position. The View, Modal, and RideShareCard stay mounted across
  // renders; only their props change. The native node behind `cardRef`
  // is stable, which is what captureRef needs.
  const shareSurface = (
    <>
      {snapshotValues ? (
        <ShareRideSheet
          visible={sheetVisible}
          onClose={closeSheet}
          values={snapshotValues}
          onConfirm={handleConfirm}
          sharing={sharing}
        />
      ) : null}

      <View
        style={styles.offscreen}
        pointerEvents="none"
        // `aria-hidden` on web; on native it's a no-op but documents intent.
        aria-hidden
      >
        {captureValues ? <RideShareCard ref={cardRef} {...captureValues} /> : null}
      </View>
    </>
  );

  return { openShareSheet, sharing, shareSurface };
}

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    // Pushed far off-screen so the card never enters a visible region
    // even on devices with negative-x safe areas. captureRef snapshots
    // by ref, not by visibility, so positioning doesn't affect output.
    left: -10000,
    top: 0,
  },
});
