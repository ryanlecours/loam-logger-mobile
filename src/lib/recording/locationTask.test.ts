import { Platform } from 'react-native';
import * as Location from 'expo-location';

jest.mock('expo-location', () => ({
  Accuracy: { BestForNavigation: 6 },
  ActivityType: { Fitness: 3 },
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  hasStartedLocationUpdatesAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));

jest.mock('./recorder', () => ({
  rideRecorder: { ingest: jest.fn(), restoreIfNeeded: jest.fn() },
}));

import { RIDE_RECORDING_TASK, rideLocationController } from './locationTask';
import { rideRecorder } from './recorder';

const mockStartTask = Location.startLocationUpdatesAsync as jest.Mock;
const mockStopTask = Location.stopLocationUpdatesAsync as jest.Mock;
const mockHasStarted = Location.hasStartedLocationUpdatesAsync as jest.Mock;
const mockWatch = Location.watchPositionAsync as jest.Mock;
const mockIngest = rideRecorder.ingest as jest.Mock;

const originalOS = Platform.OS;
function setOS(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

let removeWatch: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  removeWatch = jest.fn();
  mockStartTask.mockResolvedValue(undefined);
  mockStopTask.mockResolvedValue(undefined);
  mockHasStarted.mockResolvedValue(true);
  mockWatch.mockResolvedValue({ remove: removeWatch });
});

afterEach(async () => {
  await rideLocationController.stop();
  setOS(originalOS);
});

describe('rideLocationController', () => {
  // expo-task-manager can stop delivering the task's fixes to JS on Android
  // (expo/expo#50060), so the watch is what keeps a recording fed there.
  it('on Android, starts the background task and a watch that feeds the recorder', async () => {
    setOS('android');
    await rideLocationController.start();

    expect(mockStartTask).toHaveBeenCalledWith(RIDE_RECORDING_TASK, expect.any(Object));
    expect(mockWatch).toHaveBeenCalledTimes(1);

    const onLocation = mockWatch.mock.calls[0][1];
    onLocation({
      coords: { latitude: 48.71, longitude: -122.33, altitude: 150, altitudeAccuracy: 1, accuracy: 5, speed: 4 },
      timestamp: 1_000,
    });
    expect(mockIngest).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 48.71, longitude: -122.33, accuracy: 5, timestamp: 1_000 })
    );
  });

  it('on iOS, runs the background task alone', async () => {
    setOS('ios');
    await rideLocationController.start();

    expect(mockStartTask).toHaveBeenCalledTimes(1);
    expect(mockWatch).not.toHaveBeenCalled();
  });

  it('falls back to a watch on either platform when the task cannot start', async () => {
    setOS('ios');
    mockStartTask.mockRejectedValue(new Error('no background mode'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await rideLocationController.start();

    expect(mockWatch).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('never asks Android to change location settings for the watch', async () => {
    setOS('android');
    await rideLocationController.start();

    expect(mockWatch.mock.calls[0][0]).toEqual(
      expect.objectContaining({ mayShowUserSettingsDialog: false })
    );
  });

  it('on Android, a failed watch leaves the task running and does not fail the start', async () => {
    setOS('android');
    mockWatch.mockRejectedValue(new Error('unsatisfied device settings'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(rideLocationController.start()).resolves.toBeUndefined();

    expect(mockStartTask).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('starting again replaces the watch rather than stacking a second one', async () => {
    setOS('android');
    await rideLocationController.start();
    await rideLocationController.start();

    expect(mockWatch).toHaveBeenCalledTimes(2);
    expect(removeWatch).toHaveBeenCalledTimes(1);
  });

  it('stop removes the watch and stops the task', async () => {
    setOS('android');
    await rideLocationController.start();
    await rideLocationController.stop();

    expect(removeWatch).toHaveBeenCalledTimes(1);
    expect(mockStopTask).toHaveBeenCalledWith(RIDE_RECORDING_TASK);
  });
});
