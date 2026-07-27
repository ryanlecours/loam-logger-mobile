/**
 * Global test setup.
 *
 * react-native-maps is a native module with no JavaScript-only
 * implementation, so it cannot render under Jest. Mock it once here rather
 * than in each test file: the components stand in as plain Views that still
 * accept and expose their props, so a test can assert a Polyline received the
 * right coordinates without a native map ever existing.
 */
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMapView = React.forwardRef((props, ref) =>
    React.createElement(View, { ...props, ref, testID: props.testID ?? 'map-view' }, props.children)
  );
  MockMapView.displayName = 'MapView';

  const MockPolyline = (props) =>
    React.createElement(View, { ...props, testID: props.testID ?? 'map-polyline' });
  MockPolyline.displayName = 'Polyline';

  return {
    __esModule: true,
    default: MockMapView,
    Polyline: MockPolyline,
    Marker: (props) => React.createElement(View, props),
    PROVIDER_GOOGLE: 'google',
    PROVIDER_DEFAULT: undefined,
  };
});
