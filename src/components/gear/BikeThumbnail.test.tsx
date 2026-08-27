import { render, screen, fireEvent } from '@testing-library/react-native';
import { BikeThumbnail } from './BikeThumbnail';

/**
 * NOTE: in @testing-library/react-native v14 `render` is ASYNC (React 19
 * concurrent rendering) and resolves to void rather than returning a query
 * bundle. Every render must be awaited, and queries come from the global
 * `screen`.
 *
 * The thumbnail is hidden from the accessibility tree on purpose: the bike's
 * name always sits beside it, so announcing the photo would just repeat it.
 * Every lookup here therefore has to opt into hidden elements. If these start
 * passing without HIDDEN, the photo has stopped being decorative and VoiceOver
 * users are hearing it twice.
 */
const HIDDEN = { includeHiddenElements: true } as const;

const IMAGE = 'bike-thumbnail-image';
const PLACEHOLDER = 'bike-thumbnail-placeholder';
const URI = 'https://example.test/bike.jpg';

describe('BikeThumbnail', () => {
  it('renders the photo when a url is present', async () => {
    await render(<BikeThumbnail uri={URI} />);

    const image = screen.getByTestId(IMAGE, HIDDEN);
    expect(image.props.source).toEqual({ uri: URI });
    expect(screen.queryByTestId(PLACEHOLDER, HIDDEN)).toBeNull();
  });

  it('falls back to the bicycle glyph when there is no url', async () => {
    await render(<BikeThumbnail uri={null} />);

    expect(screen.getByTestId(PLACEHOLDER, HIDDEN)).toBeTruthy();
    expect(screen.queryByTestId(IMAGE, HIDDEN)).toBeNull();
  });

  // The rider's own bike is cropped to fill the well. Catalog search results
  // are not: the image is there to tell two near-identical trims apart, and a
  // center crop of a wide studio shot shows nothing but a shock.
  it('crops by default and letterboxes when asked to fit', async () => {
    await render(<BikeThumbnail uri={URI} />);
    expect(screen.getByTestId(IMAGE, HIDDEN).props.resizeMode).toBe('cover');

    await screen.rerender(<BikeThumbnail uri={URI} fit="contain" />);
    expect(screen.getByTestId(IMAGE, HIDDEN).props.resizeMode).toBe('contain');
  });

  // thumbnailUrl points at remote storage and a 404 is silent. Before this, a
  // dead link rendered an empty dark square, which reads as a rendering fault
  // rather than a missing photo. Both failures should now look the same.
  it('falls back to the glyph when the photo fails to load', async () => {
    await render(<BikeThumbnail uri={URI} />);

    await fireEvent(screen.getByTestId(IMAGE, HIDDEN), 'error');

    expect(screen.getByTestId(PLACEHOLDER, HIDDEN)).toBeTruthy();
    expect(screen.queryByTestId(IMAGE, HIDDEN)).toBeNull();
  });

  // A rider who replaces a broken photo must not stay stuck on the glyph for
  // the life of the mounted component.
  it('retries the photo when the url changes after a failure', async () => {
    await render(<BikeThumbnail uri={URI} />);
    await fireEvent(screen.getByTestId(IMAGE, HIDDEN), 'error');
    expect(screen.getByTestId(PLACEHOLDER, HIDDEN)).toBeTruthy();

    await screen.rerender(<BikeThumbnail uri="https://example.test/replacement.jpg" />);

    expect(screen.getByTestId(IMAGE, HIDDEN)).toBeTruthy();
    expect(screen.queryByTestId(PLACEHOLDER, HIDDEN)).toBeNull();
  });
});
