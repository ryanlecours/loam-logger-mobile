import { Children, isValidElement, type ReactElement } from 'react';

import { GoogleGLogo } from './GoogleGLogo';

/**
 * Google's mark must match its branding guidelines exactly, so pin the four
 * brand colors in order and the 20pt default from Google's button spec. The
 * logo is a pure element tree, so it is inspected directly rather than
 * rendered (react-native-svg draws natively).
 */
type SvgProps = { width: number; height: number; children: ReactElement<{ fill: string }>[] };

function logo(size?: number) {
  return GoogleGLogo(size === undefined ? {} : { size }) as ReactElement<SvgProps>;
}

describe('GoogleGLogo', () => {
  it("draws Google's four-color G", () => {
    const fills = Children.toArray(logo().props.children)
      .filter(isValidElement)
      .map((path) => (path as ReactElement<{ fill: string }>).props.fill);
    expect(fills).toEqual(['#EA4335', '#4285F4', '#FBBC05', '#34A853']);
  });

  it('defaults to the 20pt size in Google spec, and takes another', () => {
    expect(logo().props).toEqual(expect.objectContaining({ width: 20, height: 20 }));
    expect(logo(24).props).toEqual(expect.objectContaining({ width: 24, height: 24 }));
  });
});
