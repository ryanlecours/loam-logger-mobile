import { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../constants/theme';

interface BikeThumbnailProps {
  uri?: string | null;
  /** 44 in dense rows, 48 in section headers, 80 on inventory cards. Nothing between. */
  size?: number;
  /** One step below the containing surface's radius. Worn-Smooth Rule. */
  cornerRadius?: number;
}

/**
 * A bike's photo, at thumbnail scale.
 *
 * Identity, never status. A photo tells the rider WHICH bike; the named health
 * pill beside it tells them HOW it is. No tint, ring or ramp-colored border
 * ever lands on the image, which is also why this takes no status prop.
 *
 * The well is `colors.surface`, not the page background: catalog photos are
 * often letterboxed or transparent, and they have to still read as a filled
 * tile sitting on the card rather than a hole punched through it. Three call
 * sites used to disagree on this (background / card / surface).
 *
 * A dead URL used to render an empty dark square: `thumbnailUrl` points at
 * remote storage and a 404 is silent. `onError` degrades to the same glyph a
 * bike with no photo gets, so the two failure modes look identical instead of
 * one of them looking like a rendering bug.
 */
export function BikeThumbnail({ uri, size = 48, cornerRadius = radius.sm }: BikeThumbnailProps) {
  const [failed, setFailed] = useState(false);

  // A rider who replaces a broken photo must not stay stuck on the glyph.
  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const showImage = !!uri && !failed;

  return (
    <View
      style={[styles.well, { width: size, height: size, borderRadius: cornerRadius }]}
      // The bike's name always sits beside this. A photo of a bike adds nothing
      // spoken, and announcing it would just double up the name.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {showImage ? (
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setFailed(true)}
          testID="bike-thumbnail-image"
        />
      ) : (
        <View style={styles.placeholder} testID="bike-thumbnail-placeholder">
          <Ionicons name="bicycle" size={Math.round(size * 0.5)} color={colors.textMuted} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  well: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
    // Without this the photo is the first thing a row squeezes when the bike
    // name is long or Dynamic Type is turned up.
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
