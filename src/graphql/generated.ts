import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type AcceptTermsInput = {
  termsVersion: Scalars['String']['input'];
};

export type AcceptTermsResult = {
  __typename?: 'AcceptTermsResult';
  acceptedAt: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type AcknowledgeResult = {
  __typename?: 'AcknowledgeResult';
  success: Scalars['Boolean']['output'];
};

export enum AcquisitionCondition {
  Mixed = 'MIXED',
  New = 'NEW',
  Used = 'USED'
}

export type AddBikeInput = {
  acquisitionCondition?: InputMaybe<AcquisitionCondition>;
  acquisitionDate?: InputMaybe<Scalars['String']['input']>;
  batteryWh?: InputMaybe<Scalars['Int']['input']>;
  buildKind?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  family?: InputMaybe<Scalars['String']['input']>;
  fork?: InputMaybe<BikeComponentInput>;
  frameMaterial?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  hangerStandard?: InputMaybe<Scalars['String']['input']>;
  isEbike?: InputMaybe<Scalars['Boolean']['input']>;
  isFrameset?: InputMaybe<Scalars['Boolean']['input']>;
  manufacturer: Scalars['String']['input'];
  model: Scalars['String']['input'];
  motorMaker?: InputMaybe<Scalars['String']['input']>;
  motorModel?: InputMaybe<Scalars['String']['input']>;
  motorPowerW?: InputMaybe<Scalars['Int']['input']>;
  motorTorqueNm?: InputMaybe<Scalars['Int']['input']>;
  nickname?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  pairedComponentConfigs?: InputMaybe<Array<PairedComponentConfigInput>>;
  pivotBearings?: InputMaybe<BikeComponentInput>;
  seatpost?: InputMaybe<BikeComponentInput>;
  shock?: InputMaybe<BikeComponentInput>;
  spokesComponents?: InputMaybe<SpokesComponentsInput>;
  spokesId?: InputMaybe<Scalars['String']['input']>;
  spokesUrl?: InputMaybe<Scalars['String']['input']>;
  subcategory?: InputMaybe<Scalars['String']['input']>;
  thumbnailUrl?: InputMaybe<Scalars['String']['input']>;
  travelForkMm?: InputMaybe<Scalars['Int']['input']>;
  travelShockMm?: InputMaybe<Scalars['Int']['input']>;
  wheels?: InputMaybe<BikeComponentInput>;
  year: Scalars['Int']['input'];
};

export type AddBikeNoteInput = {
  bikeId: Scalars['ID']['input'];
  text: Scalars['String']['input'];
};

export type AddComponentInput = {
  brand?: InputMaybe<Scalars['String']['input']>;
  hoursUsed?: InputMaybe<Scalars['Float']['input']>;
  installedAt?: InputMaybe<Scalars['String']['input']>;
  isStock?: InputMaybe<Scalars['Boolean']['input']>;
  location?: InputMaybe<ComponentLocation>;
  model?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  serviceDueAtHours?: InputMaybe<Scalars['Float']['input']>;
  type: ComponentType;
};

export type AddRideInput = {
  averageHr?: InputMaybe<Scalars['Int']['input']>;
  bikeId?: InputMaybe<Scalars['ID']['input']>;
  distanceMeters: Scalars['Float']['input'];
  durationSeconds: Scalars['Int']['input'];
  elevationGainMeters: Scalars['Float']['input'];
  location?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  rideType: Scalars['String']['input'];
  startTime: Scalars['String']['input'];
  trailSystem?: InputMaybe<Scalars['String']['input']>;
};

export type BackfillWeatherResult = {
  __typename?: 'BackfillWeatherResult';
  enqueuedCount: Scalars['Int']['output'];
  remainingAfterBatch: Scalars['Int']['output'];
  ridesWithoutCoords: Scalars['Int']['output'];
};

export enum BaselineConfidence {
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM'
}

export enum BaselineMethod {
  Dates = 'DATES',
  Default = 'DEFAULT',
  Slider = 'SLIDER'
}

export type Bike = {
  __typename?: 'Bike';
  acquisitionCondition?: Maybe<AcquisitionCondition>;
  acquisitionDate?: Maybe<Scalars['String']['output']>;
  batteryWh?: Maybe<Scalars['Int']['output']>;
  buildKind?: Maybe<Scalars['String']['output']>;
  category?: Maybe<Scalars['String']['output']>;
  components: Array<Component>;
  createdAt: Scalars['String']['output'];
  family?: Maybe<Scalars['String']['output']>;
  fork?: Maybe<Component>;
  frameMaterial?: Maybe<Scalars['String']['output']>;
  gender?: Maybe<Scalars['String']['output']>;
  hangerStandard?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isEbike?: Maybe<Scalars['Boolean']['output']>;
  isFrameset?: Maybe<Scalars['Boolean']['output']>;
  manufacturer: Scalars['String']['output'];
  model: Scalars['String']['output'];
  motorMaker?: Maybe<Scalars['String']['output']>;
  motorModel?: Maybe<Scalars['String']['output']>;
  motorPowerW?: Maybe<Scalars['Int']['output']>;
  motorTorqueNm?: Maybe<Scalars['Int']['output']>;
  nickname?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  notificationPreference?: Maybe<BikeNotificationPreference>;
  pivotBearings?: Maybe<Component>;
  predictions?: Maybe<BikePredictionSummary>;
  retiredAt?: Maybe<Scalars['String']['output']>;
  seatpost?: Maybe<Component>;
  servicePreferences: Array<BikeServicePreference>;
  shock?: Maybe<Component>;
  sortOrder: Scalars['Int']['output'];
  spokesId?: Maybe<Scalars['String']['output']>;
  spokesUrl?: Maybe<Scalars['String']['output']>;
  status: BikeStatus;
  subcategory?: Maybe<Scalars['String']['output']>;
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
  travelForkMm?: Maybe<Scalars['Int']['output']>;
  travelShockMm?: Maybe<Scalars['Int']['output']>;
  updatedAt: Scalars['String']['output'];
  wheels?: Maybe<Component>;
  year?: Maybe<Scalars['Int']['output']>;
};

export type BikeCalibrationInfo = {
  __typename?: 'BikeCalibrationInfo';
  bikeId: Scalars['ID']['output'];
  bikeName: Scalars['String']['output'];
  components: Array<ComponentPrediction>;
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
};

export type BikeComponentInput = {
  brand?: InputMaybe<Scalars['String']['input']>;
  isStock?: InputMaybe<Scalars['Boolean']['input']>;
  model?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
};

export type BikeComponentInstall = {
  __typename?: 'BikeComponentInstall';
  bikeId: Scalars['ID']['output'];
  componentId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  installedAt: Scalars['String']['output'];
  removedAt?: Maybe<Scalars['String']['output']>;
  slotKey: Scalars['String']['output'];
};

export type BikeHistoryPayload = {
  __typename?: 'BikeHistoryPayload';
  bike: Bike;
  installs: Array<ComponentInstallEvent>;
  rides: Array<Ride>;
  serviceEvents: Array<ServiceEvent>;
  totals: BikeHistoryTotals;
  truncated: Scalars['Boolean']['output'];
};

export type BikeHistoryTotals = {
  __typename?: 'BikeHistoryTotals';
  installEventCount: Scalars['Int']['output'];
  rideCount: Scalars['Int']['output'];
  serviceEventCount: Scalars['Int']['output'];
  totalDistanceMeters: Scalars['Float']['output'];
  totalDurationSeconds: Scalars['Int']['output'];
  totalElevationGainMeters: Scalars['Float']['output'];
};

export type BikeNote = {
  __typename?: 'BikeNote';
  bikeId: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  installEventId?: Maybe<Scalars['ID']['output']>;
  noteType: BikeNoteType;
  snapshot?: Maybe<SetupSnapshot>;
  snapshotAfter?: Maybe<SetupSnapshot>;
  snapshotBefore?: Maybe<SetupSnapshot>;
  text: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

export enum BikeNoteType {
  Manual = 'MANUAL',
  Swap = 'SWAP'
}

export type BikeNotesPage = {
  __typename?: 'BikeNotesPage';
  hasMore: Scalars['Boolean']['output'];
  items: Array<BikeNote>;
  totalCount: Scalars['Int']['output'];
};

export type BikeNotificationPreference = {
  __typename?: 'BikeNotificationPreference';
  bikeId: Scalars['ID']['output'];
  serviceNotificationMode: ServiceNotificationMode;
  serviceNotificationThreshold: Scalars['Int']['output'];
  serviceNotificationsEnabled: Scalars['Boolean']['output'];
};

export type BikePredictionSummary = {
  __typename?: 'BikePredictionSummary';
  algoVersion: Scalars['String']['output'];
  bikeId: Scalars['ID']['output'];
  bikeName: Scalars['String']['output'];
  components: Array<ComponentPrediction>;
  dueNowCount: Scalars['Int']['output'];
  dueSoonCount: Scalars['Int']['output'];
  generatedAt: Scalars['String']['output'];
  overallStatus: PredictionStatus;
  priorityComponent?: Maybe<ComponentPrediction>;
};

export type BikeServicePreference = {
  __typename?: 'BikeServicePreference';
  componentType: ComponentType;
  customInterval?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  trackingEnabled: Scalars['Boolean']['output'];
};

export type BikeServicePreferenceInput = {
  componentType: ComponentType;
  customInterval?: InputMaybe<Scalars['Float']['input']>;
  trackingEnabled: Scalars['Boolean']['input'];
};

export type BikeSpecsSnapshot = {
  __typename?: 'BikeSpecsSnapshot';
  batteryWh?: Maybe<Scalars['Int']['output']>;
  isEbike: Scalars['Boolean']['output'];
  motorMaker?: Maybe<Scalars['String']['output']>;
  motorModel?: Maybe<Scalars['String']['output']>;
  motorPowerW?: Maybe<Scalars['Int']['output']>;
  motorTorqueNm?: Maybe<Scalars['Int']['output']>;
  travelForkMm?: Maybe<Scalars['Int']['output']>;
  travelShockMm?: Maybe<Scalars['Int']['output']>;
};

export enum BikeStatus {
  Active = 'ACTIVE',
  Archived = 'ARCHIVED',
  Retired = 'RETIRED',
  Sold = 'SOLD'
}

export type BillingPortalResult = {
  __typename?: 'BillingPortalResult';
  url: Scalars['String']['output'];
};

export type BulkAssignResult = {
  __typename?: 'BulkAssignResult';
  success: Scalars['Boolean']['output'];
  updatedCount: Scalars['Int']['output'];
};

export type BulkServiceLogInput = {
  componentIds: Array<Scalars['ID']['input']>;
  performedAt: Scalars['String']['input'];
};

export type BulkServiceResult = {
  __typename?: 'BulkServiceResult';
  success: Scalars['Boolean']['output'];
  updatedCount: Scalars['Int']['output'];
};

export type BulkUpdateBaselinesInput = {
  updates: Array<ComponentBaselineInput>;
};

/**
 * Apply the same installedAt to multiple BikeComponentInstall rows in a
 * single mutation. All rows must belong to the viewer — the batch is
 * all-or-nothing to avoid leaking which ids they don't own.
 */
export type BulkUpdateBikeComponentInstallsInput = {
  ids: Array<Scalars['ID']['input']>;
  installedAt: Scalars['String']['input'];
};

export type BulkUpdateBikeComponentInstallsResult = {
  __typename?: 'BulkUpdateBikeComponentInstallsResult';
  serviceLogsMoved: Scalars['Int']['output'];
  updatedCount: Scalars['Int']['output'];
};

export type CalibrationState = {
  __typename?: 'CalibrationState';
  bikes: Array<BikeCalibrationInfo>;
  overdueCount: Scalars['Int']['output'];
  showOverlay: Scalars['Boolean']['output'];
  totalComponentCount: Scalars['Int']['output'];
};

export enum CheckoutPlatform {
  Mobile = 'MOBILE',
  Web = 'WEB'
}

export type CheckoutSessionResult = {
  __typename?: 'CheckoutSessionResult';
  sessionId: Scalars['String']['output'];
  url?: Maybe<Scalars['String']['output']>;
};

export type Component = {
  __typename?: 'Component';
  baselineConfidence: BaselineConfidence;
  baselineMethod: BaselineMethod;
  baselineSetAt?: Maybe<Scalars['String']['output']>;
  baselineWearPercent?: Maybe<Scalars['Int']['output']>;
  bikeId?: Maybe<Scalars['ID']['output']>;
  brand: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  hoursUsed: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  installedAt?: Maybe<Scalars['String']['output']>;
  isSpare: Scalars['Boolean']['output'];
  isStock: Scalars['Boolean']['output'];
  lastServicedAt?: Maybe<Scalars['String']['output']>;
  latestServiceLog?: Maybe<ServiceLog>;
  location: ComponentLocation;
  model: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  pairGroupId?: Maybe<Scalars['String']['output']>;
  pairedComponent?: Maybe<Component>;
  replacedById?: Maybe<Scalars['ID']['output']>;
  retiredAt?: Maybe<Scalars['String']['output']>;
  serviceDueAtHours?: Maybe<Scalars['Float']['output']>;
  serviceLogs: Array<ServiceLog>;
  status: ComponentStatus;
  type: ComponentType;
  updatedAt: Scalars['String']['output'];
};

export type ComponentBaselineInput = {
  componentId: Scalars['ID']['input'];
  lastServicedAt?: InputMaybe<Scalars['String']['input']>;
  method: BaselineMethod;
  wearPercent: Scalars['Int']['input'];
};

export type ComponentFilterInput = {
  bikeId?: InputMaybe<Scalars['ID']['input']>;
  onlySpare?: InputMaybe<Scalars['Boolean']['input']>;
  types?: InputMaybe<Array<ComponentType>>;
};

export type ComponentInstallEvent = {
  __typename?: 'ComponentInstallEvent';
  component: Component;
  eventType: ComponentInstallEventType;
  id: Scalars['ID']['output'];
  occurredAt: Scalars['String']['output'];
};

export enum ComponentInstallEventType {
  Installed = 'INSTALLED',
  Removed = 'REMOVED'
}

export enum ComponentLocation {
  Front = 'FRONT',
  None = 'NONE',
  Rear = 'REAR'
}

export type ComponentPrediction = {
  __typename?: 'ComponentPrediction';
  brand: Scalars['String']['output'];
  componentId: Scalars['ID']['output'];
  componentType: ComponentType;
  confidence: ConfidenceLevel;
  currentHours: Scalars['Float']['output'];
  drivers?: Maybe<Array<WearDriver>>;
  hoursRemaining: Scalars['Float']['output'];
  hoursSinceService: Scalars['Float']['output'];
  location: ComponentLocation;
  model: Scalars['String']['output'];
  ridesRemainingEstimate: Scalars['Int']['output'];
  serviceIntervalHours: Scalars['Float']['output'];
  status: PredictionStatus;
  why?: Maybe<Scalars['String']['output']>;
};

export type ComponentSnapshot = {
  __typename?: 'ComponentSnapshot';
  brand: Scalars['String']['output'];
  componentId: Scalars['ID']['output'];
  hoursUsed: Scalars['Float']['output'];
  isStock: Scalars['Boolean']['output'];
  model: Scalars['String']['output'];
  serviceDueAtHours?: Maybe<Scalars['Float']['output']>;
  settings: Array<SettingSnapshot>;
};

export enum ComponentStatus {
  Installed = 'INSTALLED',
  Inventory = 'INVENTORY',
  Retired = 'RETIRED'
}

export enum ComponentType {
  BottomBracket = 'BOTTOM_BRACKET',
  Brakes = 'BRAKES',
  BrakePad = 'BRAKE_PAD',
  BrakeRotor = 'BRAKE_ROTOR',
  Cassette = 'CASSETTE',
  Chain = 'CHAIN',
  Crank = 'CRANK',
  Drivetrain = 'DRIVETRAIN',
  Dropper = 'DROPPER',
  Fork = 'FORK',
  Handlebar = 'HANDLEBAR',
  Headset = 'HEADSET',
  Other = 'OTHER',
  Pedals = 'PEDALS',
  PivotBearings = 'PIVOT_BEARINGS',
  RearDerailleur = 'REAR_DERAILLEUR',
  Rims = 'RIMS',
  Saddle = 'SADDLE',
  Seatpost = 'SEATPOST',
  Shock = 'SHOCK',
  Stem = 'STEM',
  Tires = 'TIRES',
  WheelHubs = 'WHEEL_HUBS'
}

export enum ConfidenceLevel {
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM'
}

export type ConnectedAccount = {
  __typename?: 'ConnectedAccount';
  connectedAt: Scalars['String']['output'];
  provider: Scalars['String']['output'];
};

export type CreateStravaGearMappingInput = {
  bikeId: Scalars['ID']['input'];
  stravaGearId: Scalars['String']['input'];
  stravaGearName?: InputMaybe<Scalars['String']['input']>;
};

export type DeleteResult = {
  __typename?: 'DeleteResult';
  id: Scalars['ID']['output'];
  ok: Scalars['Boolean']['output'];
};

export type DeleteRideResult = {
  __typename?: 'DeleteRideResult';
  id: Scalars['ID']['output'];
  ok: Scalars['Boolean']['output'];
};

export type ImportNotificationState = {
  __typename?: 'ImportNotificationState';
  sessionId?: Maybe<Scalars['ID']['output']>;
  showOverlay: Scalars['Boolean']['output'];
  totalImportedCount: Scalars['Int']['output'];
  unassignedRideCount: Scalars['Int']['output'];
};

export type InstallComponentInput = {
  alsoReplacePair?: InputMaybe<Scalars['Boolean']['input']>;
  bikeId: Scalars['ID']['input'];
  existingComponentId?: InputMaybe<Scalars['ID']['input']>;
  installedAt?: InputMaybe<Scalars['String']['input']>;
  newComponent?: InputMaybe<NewComponentInput>;
  noteText?: InputMaybe<Scalars['String']['input']>;
  pairNewComponent?: InputMaybe<NewComponentInput>;
  slotKey: Scalars['String']['input'];
};

export type InstallComponentResult = {
  __typename?: 'InstallComponentResult';
  displacedComponent?: Maybe<Component>;
  installedComponent: Component;
  note?: Maybe<BikeNote>;
};

export type LogServiceInput = {
  componentId: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  performedAt?: InputMaybe<Scalars['String']['input']>;
};

export type MigratePairedComponentsResult = {
  __typename?: 'MigratePairedComponentsResult';
  components: Array<Component>;
  migratedCount: Scalars['Int']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  acceptTerms: AcceptTermsResult;
  acknowledgeImportOverlay: AcknowledgeResult;
  addBike: Bike;
  addBikeNote: BikeNote;
  addComponent: Component;
  addRide: Ride;
  assignBikeToRides: BulkAssignResult;
  backfillWeatherForMyRides: BackfillWeatherResult;
  bulkUpdateBikeComponentInstalls: BulkUpdateBikeComponentInstallsResult;
  bulkUpdateComponentBaselines: Array<Component>;
  completeCalibration: User;
  createBillingPortalSession: BillingPortalResult;
  createCheckoutSession: CheckoutSessionResult;
  createStravaGearMapping: StravaGearMapping;
  deleteBike: DeleteResult;
  deleteBikeComponentInstall: Scalars['Boolean']['output'];
  deleteBikeNote: DeleteResult;
  deleteComponent: DeleteResult;
  deleteRide: DeleteRideResult;
  deleteServiceLog: Scalars['Boolean']['output'];
  deleteStravaGearMapping: DeleteResult;
  dismissCalibration: User;
  installComponent: InstallComponentResult;
  logBulkComponentService: BulkServiceResult;
  logComponentService: Component;
  logService: ServiceLog;
  markPairedComponentMigrationSeen: User;
  migratePairedComponents: MigratePairedComponentsResult;
  reactivateBike: Bike;
  replaceComponent: ReplaceComponentResult;
  resetCalibration: User;
  retireBike: Bike;
  selectBikeForDowngrade: Bike;
  snoozeComponent: Component;
  swapComponents: SwapComponentsResult;
  triggerProviderSync: TriggerSyncResult;
  updateAnalyticsOptOut: User;
  updateBike: Bike;
  updateBikeAcquisition: UpdateBikeAcquisitionResult;
  updateBikeComponentInstall: BikeComponentInstall;
  updateBikeNotificationPreference: BikeNotificationPreference;
  updateBikeServicePreferences: Array<BikeServicePreference>;
  updateBikesOrder: Array<Bike>;
  updateComponent: Component;
  updateRide: Ride;
  updateServiceLog: ServiceLog;
  updateServicePreferences: Array<UserServicePreference>;
  updateUserPreferences: User;
};


export type MutationAcceptTermsArgs = {
  input: AcceptTermsInput;
};


export type MutationAcknowledgeImportOverlayArgs = {
  importSessionId: Scalars['ID']['input'];
};


export type MutationAddBikeArgs = {
  input: AddBikeInput;
};


export type MutationAddBikeNoteArgs = {
  input: AddBikeNoteInput;
};


export type MutationAddComponentArgs = {
  bikeId?: InputMaybe<Scalars['ID']['input']>;
  input: AddComponentInput;
};


export type MutationAddRideArgs = {
  input: AddRideInput;
};


export type MutationAssignBikeToRidesArgs = {
  bikeId: Scalars['ID']['input'];
  rideIds: Array<Scalars['ID']['input']>;
};


export type MutationBulkUpdateBikeComponentInstallsArgs = {
  input: BulkUpdateBikeComponentInstallsInput;
};


export type MutationBulkUpdateComponentBaselinesArgs = {
  input: BulkUpdateBaselinesInput;
};


export type MutationCreateBillingPortalSessionArgs = {
  platform?: InputMaybe<CheckoutPlatform>;
};


export type MutationCreateCheckoutSessionArgs = {
  plan: StripePlan;
  platform?: InputMaybe<CheckoutPlatform>;
};


export type MutationCreateStravaGearMappingArgs = {
  input: CreateStravaGearMappingInput;
};


export type MutationDeleteBikeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteBikeComponentInstallArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteBikeNoteArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteComponentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteRideArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteServiceLogArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteStravaGearMappingArgs = {
  id: Scalars['ID']['input'];
};


export type MutationInstallComponentArgs = {
  input: InstallComponentInput;
};


export type MutationLogBulkComponentServiceArgs = {
  input: BulkServiceLogInput;
};


export type MutationLogComponentServiceArgs = {
  id: Scalars['ID']['input'];
  performedAt?: InputMaybe<Scalars['String']['input']>;
};


export type MutationLogServiceArgs = {
  input: LogServiceInput;
};


export type MutationReactivateBikeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationReplaceComponentArgs = {
  input: ReplaceComponentInput;
};


export type MutationRetireBikeArgs = {
  id: Scalars['ID']['input'];
  status: BikeStatus;
};


export type MutationSelectBikeForDowngradeArgs = {
  bikeId: Scalars['ID']['input'];
};


export type MutationSnoozeComponentArgs = {
  hours?: InputMaybe<Scalars['Float']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationSwapComponentsArgs = {
  input: SwapComponentsInput;
};


export type MutationTriggerProviderSyncArgs = {
  provider: SyncProvider;
};


export type MutationUpdateAnalyticsOptOutArgs = {
  optOut: Scalars['Boolean']['input'];
};


export type MutationUpdateBikeArgs = {
  id: Scalars['ID']['input'];
  input: UpdateBikeInput;
};


export type MutationUpdateBikeAcquisitionArgs = {
  bikeId: Scalars['ID']['input'];
  input: UpdateBikeAcquisitionInput;
};


export type MutationUpdateBikeComponentInstallArgs = {
  id: Scalars['ID']['input'];
  input: UpdateBikeComponentInstallInput;
};


export type MutationUpdateBikeNotificationPreferenceArgs = {
  input: UpdateBikeNotificationPreferenceInput;
};


export type MutationUpdateBikeServicePreferencesArgs = {
  input: UpdateBikeServicePreferencesInput;
};


export type MutationUpdateBikesOrderArgs = {
  bikeIds: Array<Scalars['ID']['input']>;
};


export type MutationUpdateComponentArgs = {
  id: Scalars['ID']['input'];
  input: UpdateComponentInput;
};


export type MutationUpdateRideArgs = {
  id: Scalars['ID']['input'];
  input: UpdateRideInput;
};


export type MutationUpdateServiceLogArgs = {
  id: Scalars['ID']['input'];
  input: UpdateServiceLogInput;
};


export type MutationUpdateServicePreferencesArgs = {
  input: UpdateServicePreferencesInput;
};


export type MutationUpdateUserPreferencesArgs = {
  input: UpdateUserPreferencesInput;
};

export type NewComponentInput = {
  brand: Scalars['String']['input'];
  isStock?: InputMaybe<Scalars['Boolean']['input']>;
  model: Scalars['String']['input'];
};

export type PairedComponentConfigInput = {
  frontSpec?: InputMaybe<PairedComponentSpecInput>;
  rearSpec?: InputMaybe<PairedComponentSpecInput>;
  type: ComponentType;
  useSameSpec: Scalars['Boolean']['input'];
};

export type PairedComponentSpecInput = {
  brand: Scalars['String']['input'];
  model: Scalars['String']['input'];
};

export enum PredictionStatus {
  AllGood = 'ALL_GOOD',
  DueNow = 'DUE_NOW',
  DueSoon = 'DUE_SOON',
  Overdue = 'OVERDUE'
}

export type Query = {
  __typename?: 'Query';
  bikeHistory: BikeHistoryPayload;
  bikeNotes: BikeNotesPage;
  bikes: Array<Bike>;
  calibrationState?: Maybe<CalibrationState>;
  components: Array<Component>;
  importNotificationState?: Maybe<ImportNotificationState>;
  me?: Maybe<User>;
  referralStats: ReferralStats;
  rideTypes: Array<RideType>;
  rides: Array<Ride>;
  servicePreferenceDefaults: Array<ServicePreferenceDefault>;
  stravaGearMappings: Array<StravaGearMapping>;
  unassignedRides: UnassignedRidesPage;
  unmappedStravaGears: Array<StravaGearInfo>;
  user?: Maybe<User>;
};


export type QueryBikeHistoryArgs = {
  bikeId: Scalars['ID']['input'];
  endDate?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
};


export type QueryBikeNotesArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  bikeId: Scalars['ID']['input'];
  take?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryBikesArgs = {
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryComponentsArgs = {
  filter?: InputMaybe<ComponentFilterInput>;
};


export type QueryRidesArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  filter?: InputMaybe<RidesFilterInput>;
  take?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryUnassignedRidesArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  importSessionId: Scalars['ID']['input'];
  take?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};

export type ReferralStats = {
  __typename?: 'ReferralStats';
  completedCount: Scalars['Int']['output'];
  pendingCount: Scalars['Int']['output'];
  referralCode: Scalars['String']['output'];
  referralLink: Scalars['String']['output'];
};

export type ReplaceComponentInput = {
  alsoReplacePair?: InputMaybe<Scalars['Boolean']['input']>;
  componentId: Scalars['ID']['input'];
  installedAt?: InputMaybe<Scalars['String']['input']>;
  newBrand: Scalars['String']['input'];
  newModel: Scalars['String']['input'];
  pairBrand?: InputMaybe<Scalars['String']['input']>;
  pairModel?: InputMaybe<Scalars['String']['input']>;
};

export type ReplaceComponentResult = {
  __typename?: 'ReplaceComponentResult';
  newComponents: Array<Component>;
  replacedComponents: Array<Component>;
};

export type Ride = {
  __typename?: 'Ride';
  averageHr?: Maybe<Scalars['Int']['output']>;
  bikeId?: Maybe<Scalars['ID']['output']>;
  createdAt: Scalars['String']['output'];
  distanceMeters: Scalars['Float']['output'];
  durationSeconds: Scalars['Int']['output'];
  elevationGainMeters: Scalars['Float']['output'];
  garminActivityId?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  location?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  rideType: Scalars['String']['output'];
  startTime: Scalars['String']['output'];
  stravaActivityId?: Maybe<Scalars['String']['output']>;
  stravaGearId?: Maybe<Scalars['String']['output']>;
  suuntoWorkoutId?: Maybe<Scalars['String']['output']>;
  trailSystem?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
  weather?: Maybe<RideWeather>;
  whoopWorkoutId?: Maybe<Scalars['String']['output']>;
};

export enum RideType {
  Commute = 'COMMUTE',
  Enduro = 'ENDURO',
  Gravel = 'GRAVEL',
  Road = 'ROAD',
  Trail = 'TRAIL',
  Trainer = 'TRAINER'
}

export type RideWeather = {
  __typename?: 'RideWeather';
  condition: WeatherCondition;
  feelsLikeC?: Maybe<Scalars['Float']['output']>;
  fetchedAt: Scalars['String']['output'];
  humidity?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  lat: Scalars['Float']['output'];
  lng: Scalars['Float']['output'];
  precipitationMm: Scalars['Float']['output'];
  source: Scalars['String']['output'];
  tempC: Scalars['Float']['output'];
  windSpeedKph: Scalars['Float']['output'];
  wmoCode: Scalars['Int']['output'];
};

export type RidesFilterInput = {
  bikeId?: InputMaybe<Scalars['ID']['input']>;
  endDate?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
};

export type ServiceEvent = {
  __typename?: 'ServiceEvent';
  component: Component;
  hoursAtService: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  performedAt: Scalars['String']['output'];
};

export type ServiceLog = {
  __typename?: 'ServiceLog';
  componentId: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  hoursAtService: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  performedAt: Scalars['String']['output'];
};

export enum ServiceNotificationMode {
  AtService = 'AT_SERVICE',
  HoursBefore = 'HOURS_BEFORE',
  RidesBefore = 'RIDES_BEFORE'
}

export type ServicePreferenceDefault = {
  __typename?: 'ServicePreferenceDefault';
  componentType: ComponentType;
  defaultInterval: Scalars['Float']['output'];
  defaultIntervalFront?: Maybe<Scalars['Float']['output']>;
  defaultIntervalRear?: Maybe<Scalars['Float']['output']>;
  displayName: Scalars['String']['output'];
};

export type ServicePreferenceInput = {
  componentType: ComponentType;
  customInterval?: InputMaybe<Scalars['Float']['input']>;
  trackingEnabled: Scalars['Boolean']['input'];
};

export type SettingSnapshot = {
  __typename?: 'SettingSnapshot';
  key: Scalars['String']['output'];
  label: Scalars['String']['output'];
  unit?: Maybe<Scalars['String']['output']>;
  value: Scalars['String']['output'];
};

export type SetupSnapshot = {
  __typename?: 'SetupSnapshot';
  bikeSpecs: BikeSpecsSnapshot;
  capturedAt: Scalars['String']['output'];
  slots: Array<SlotSnapshot>;
};

export type SlotSnapshot = {
  __typename?: 'SlotSnapshot';
  component?: Maybe<ComponentSnapshot>;
  componentType: Scalars['String']['output'];
  location: Scalars['String']['output'];
  slotKey: Scalars['String']['output'];
};

export type SpokesComponentInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  kind?: InputMaybe<Scalars['String']['input']>;
  maker?: InputMaybe<Scalars['String']['input']>;
  model?: InputMaybe<Scalars['String']['input']>;
};

export type SpokesComponentsInput = {
  bottomBracket?: InputMaybe<SpokesComponentInput>;
  brakes?: InputMaybe<SpokesComponentInput>;
  cassette?: InputMaybe<SpokesComponentInput>;
  chain?: InputMaybe<SpokesComponentInput>;
  crank?: InputMaybe<SpokesComponentInput>;
  discRotors?: InputMaybe<SpokesComponentInput>;
  fork?: InputMaybe<SpokesComponentInput>;
  handlebar?: InputMaybe<SpokesComponentInput>;
  headset?: InputMaybe<SpokesComponentInput>;
  rearDerailleur?: InputMaybe<SpokesComponentInput>;
  rearShock?: InputMaybe<SpokesComponentInput>;
  rims?: InputMaybe<SpokesComponentInput>;
  saddle?: InputMaybe<SpokesComponentInput>;
  seatpost?: InputMaybe<SpokesComponentInput>;
  stem?: InputMaybe<SpokesComponentInput>;
  tires?: InputMaybe<SpokesComponentInput>;
  wheels?: InputMaybe<SpokesComponentInput>;
};

export type StravaGearInfo = {
  __typename?: 'StravaGearInfo';
  gearId: Scalars['String']['output'];
  gearName?: Maybe<Scalars['String']['output']>;
  isMapped: Scalars['Boolean']['output'];
  rideCount: Scalars['Int']['output'];
};

export type StravaGearMapping = {
  __typename?: 'StravaGearMapping';
  bike: Bike;
  bikeId: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  stravaGearId: Scalars['String']['output'];
  stravaGearName?: Maybe<Scalars['String']['output']>;
};

export enum StripePlan {
  Annual = 'ANNUAL',
  Monthly = 'MONTHLY'
}

export enum SubscriptionProvider {
  Apple = 'APPLE',
  Google = 'GOOGLE',
  Stripe = 'STRIPE'
}

export enum SubscriptionTier {
  FreeFull = 'FREE_FULL',
  FreeLight = 'FREE_LIGHT',
  Pro = 'PRO'
}

export type SwapComponentsInput = {
  bikeIdA: Scalars['ID']['input'];
  bikeIdB: Scalars['ID']['input'];
  installedAt?: InputMaybe<Scalars['String']['input']>;
  noteText?: InputMaybe<Scalars['String']['input']>;
  slotKeyA: Scalars['String']['input'];
  slotKeyB: Scalars['String']['input'];
};

export type SwapComponentsResult = {
  __typename?: 'SwapComponentsResult';
  componentA: Component;
  componentB: Component;
  noteA?: Maybe<BikeNote>;
  noteB?: Maybe<BikeNote>;
};

export enum SyncProvider {
  Garmin = 'GARMIN',
  Strava = 'STRAVA',
  Suunto = 'SUUNTO',
  Whoop = 'WHOOP'
}

export type TierLimits = {
  __typename?: 'TierLimits';
  allowedComponentTypes: Array<ComponentType>;
  canAddBike: Scalars['Boolean']['output'];
  currentBikeCount: Scalars['Int']['output'];
  maxBikes?: Maybe<Scalars['Int']['output']>;
};

export type TriggerSyncResult = {
  __typename?: 'TriggerSyncResult';
  jobId?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  retryAfter?: Maybe<Scalars['Int']['output']>;
  status: TriggerSyncStatus;
};

export enum TriggerSyncStatus {
  AlreadyQueued = 'ALREADY_QUEUED',
  Queued = 'QUEUED',
  RateLimited = 'RATE_LIMITED'
}

export type UnassignedRide = {
  __typename?: 'UnassignedRide';
  distanceMeters: Scalars['Float']['output'];
  durationSeconds: Scalars['Int']['output'];
  elevationGainMeters: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  location?: Maybe<Scalars['String']['output']>;
  rideType: Scalars['String']['output'];
  startTime: Scalars['String']['output'];
};

export type UnassignedRidesPage = {
  __typename?: 'UnassignedRidesPage';
  hasMore: Scalars['Boolean']['output'];
  rides: Array<UnassignedRide>;
  totalCount: Scalars['Int']['output'];
};

/**
 * Retroactively fix a bike's acquisition date and, when requested, the
 * install dates of every stock component + any install whose date was
 * auto-stamped at bike creation. Built for users who added bikes before
 * the acquisition-date feature existed and now see every stock part
 * installed on the same day on BikeHistory.
 */
export type UpdateBikeAcquisitionInput = {
  acquisitionDate: Scalars['String']['input'];
  /**
   * When true (default), move the installedAt on every BikeComponentInstall
   * matching the "buggy auto-date" predicate to the new acquisitionDate,
   * and move the corresponding synthetic baseline ServiceLog alongside.
   */
  cascadeInstalls?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateBikeAcquisitionResult = {
  __typename?: 'UpdateBikeAcquisitionResult';
  bike: Bike;
  installsMoved: Scalars['Int']['output'];
  serviceLogsMoved: Scalars['Int']['output'];
};

/**
 * Patch fields on a BikeComponentInstall row.
 *
 * **Null handling is asymmetric**, mirroring the underlying Prisma schema:
 *
 * - `installedAt`: an ISO date string updates the value. `null` or omitted
 *   is a no-op. You cannot clear this field — `installedAt` is required at
 *   the database level.
 * - `removedAt`: an ISO date string updates the value. Explicit `null`
 *   **clears** the field (the component is no longer marked as removed).
 *   Omitting the key is a no-op.
 */
export type UpdateBikeComponentInstallInput = {
  /** ISO date string. Pass to update; null or omitted is ignored (cannot be cleared). */
  installedAt?: InputMaybe<Scalars['String']['input']>;
  /** ISO date string to set, or explicit null to clear. */
  removedAt?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateBikeInput = {
  acquisitionDate?: InputMaybe<Scalars['String']['input']>;
  batteryWh?: InputMaybe<Scalars['Int']['input']>;
  buildKind?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  family?: InputMaybe<Scalars['String']['input']>;
  fork?: InputMaybe<BikeComponentInput>;
  frameMaterial?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  hangerStandard?: InputMaybe<Scalars['String']['input']>;
  isEbike?: InputMaybe<Scalars['Boolean']['input']>;
  isFrameset?: InputMaybe<Scalars['Boolean']['input']>;
  manufacturer?: InputMaybe<Scalars['String']['input']>;
  model?: InputMaybe<Scalars['String']['input']>;
  motorMaker?: InputMaybe<Scalars['String']['input']>;
  motorModel?: InputMaybe<Scalars['String']['input']>;
  motorPowerW?: InputMaybe<Scalars['Int']['input']>;
  motorTorqueNm?: InputMaybe<Scalars['Int']['input']>;
  nickname?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  pivotBearings?: InputMaybe<BikeComponentInput>;
  seatpost?: InputMaybe<BikeComponentInput>;
  shock?: InputMaybe<BikeComponentInput>;
  spokesComponents?: InputMaybe<SpokesComponentsInput>;
  spokesId?: InputMaybe<Scalars['String']['input']>;
  spokesUrl?: InputMaybe<Scalars['String']['input']>;
  subcategory?: InputMaybe<Scalars['String']['input']>;
  thumbnailUrl?: InputMaybe<Scalars['String']['input']>;
  travelForkMm?: InputMaybe<Scalars['Int']['input']>;
  travelShockMm?: InputMaybe<Scalars['Int']['input']>;
  wheels?: InputMaybe<BikeComponentInput>;
  year?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateBikeNotificationPreferenceInput = {
  bikeId: Scalars['ID']['input'];
  serviceNotificationMode?: InputMaybe<ServiceNotificationMode>;
  serviceNotificationThreshold?: InputMaybe<Scalars['Int']['input']>;
  serviceNotificationsEnabled?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateBikeServicePreferencesInput = {
  bikeId: Scalars['ID']['input'];
  preferences: Array<BikeServicePreferenceInput>;
};

export type UpdateComponentInput = {
  brand?: InputMaybe<Scalars['String']['input']>;
  hoursUsed?: InputMaybe<Scalars['Float']['input']>;
  isStock?: InputMaybe<Scalars['Boolean']['input']>;
  location?: InputMaybe<ComponentLocation>;
  model?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  serviceDueAtHours?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateRideInput = {
  averageHr?: InputMaybe<Scalars['Int']['input']>;
  bikeId?: InputMaybe<Scalars['ID']['input']>;
  distanceMeters?: InputMaybe<Scalars['Float']['input']>;
  durationSeconds?: InputMaybe<Scalars['Int']['input']>;
  elevationGainMeters?: InputMaybe<Scalars['Float']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  rideType?: InputMaybe<Scalars['String']['input']>;
  startTime?: InputMaybe<Scalars['String']['input']>;
  trailSystem?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateServiceLogInput = {
  hoursAtService?: InputMaybe<Scalars['Float']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  performedAt?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateServicePreferencesInput = {
  preferences: Array<ServicePreferenceInput>;
};

export type UpdateUserPreferencesInput = {
  distanceUnit?: InputMaybe<Scalars['String']['input']>;
  expoPushToken?: InputMaybe<Scalars['String']['input']>;
  hoursDisplayPreference?: InputMaybe<Scalars['String']['input']>;
  notifyOnRideUpload?: InputMaybe<Scalars['Boolean']['input']>;
  predictionMode?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  accounts: Array<ConnectedAccount>;
  activeDataSource?: Maybe<Scalars['String']['output']>;
  age?: Maybe<Scalars['Int']['output']>;
  analyticsOptOut: Scalars['Boolean']['output'];
  avatarUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  distanceUnit?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  hasAcceptedCurrentTerms: Scalars['Boolean']['output'];
  hasPassword: Scalars['Boolean']['output'];
  hoursDisplayPreference?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isFoundingRider: Scalars['Boolean']['output'];
  location?: Maybe<Scalars['String']['output']>;
  mustChangePassword: Scalars['Boolean']['output'];
  name?: Maybe<Scalars['String']['output']>;
  needsDowngradeSelection: Scalars['Boolean']['output'];
  needsReauthForSensitiveActions: Scalars['Boolean']['output'];
  notifyOnRideUpload: Scalars['Boolean']['output'];
  onboardingCompleted: Scalars['Boolean']['output'];
  pairedComponentMigrationSeenAt?: Maybe<Scalars['String']['output']>;
  predictionMode?: Maybe<Scalars['String']['output']>;
  referralCode?: Maybe<Scalars['String']['output']>;
  rides: Array<Ride>;
  ridesMissingWeather: Scalars['Int']['output'];
  role: UserRole;
  servicePreferences: Array<UserServicePreference>;
  subscriptionProvider?: Maybe<SubscriptionProvider>;
  subscriptionTier: SubscriptionTier;
  tierLimits: TierLimits;
  weatherBreakdown: WeatherBreakdown;
};


export type UserWeatherBreakdownArgs = {
  filter?: InputMaybe<RidesFilterInput>;
};

export enum UserRole {
  Admin = 'ADMIN',
  Free = 'FREE',
  Pro = 'PRO',
  Waitlist = 'WAITLIST'
}

export type UserServicePreference = {
  __typename?: 'UserServicePreference';
  componentType: ComponentType;
  customInterval?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  trackingEnabled: Scalars['Boolean']['output'];
};

export type WearDriver = {
  __typename?: 'WearDriver';
  contribution: Scalars['Int']['output'];
  factor: Scalars['String']['output'];
  label: Scalars['String']['output'];
};

export type WeatherBreakdown = {
  __typename?: 'WeatherBreakdown';
  cloudy: Scalars['Int']['output'];
  foggy: Scalars['Int']['output'];
  pending: Scalars['Int']['output'];
  rainy: Scalars['Int']['output'];
  snowy: Scalars['Int']['output'];
  sunny: Scalars['Int']['output'];
  totalRides: Scalars['Int']['output'];
  unknown: Scalars['Int']['output'];
  windy: Scalars['Int']['output'];
};

export enum WeatherCondition {
  Cloudy = 'CLOUDY',
  Foggy = 'FOGGY',
  Rainy = 'RAINY',
  Snowy = 'SNOWY',
  Sunny = 'SUNNY',
  Unknown = 'UNKNOWN',
  Windy = 'WINDY'
}

export type AcceptTermsMutationVariables = Exact<{
  input: AcceptTermsInput;
}>;


export type AcceptTermsMutation = { __typename?: 'Mutation', acceptTerms: { __typename?: 'AcceptTermsResult', success: boolean, acceptedAt: string } };

export type AddRideMutationVariables = Exact<{
  input: AddRideInput;
}>;


export type AddRideMutation = { __typename?: 'Mutation', addRide: { __typename?: 'Ride', id: string, startTime: string, durationSeconds: number, distanceMeters: number, elevationGainMeters: number, rideType: string, bikeId?: string | null, location?: string | null, notes?: string | null } };

export type BackfillWeatherForMyRidesMutationVariables = Exact<{ [key: string]: never; }>;


export type BackfillWeatherForMyRidesMutation = { __typename?: 'Mutation', backfillWeatherForMyRides: { __typename?: 'BackfillWeatherResult', enqueuedCount: number, ridesWithoutCoords: number, remainingAfterBatch: number } };

export type RidesMissingWeatherQueryVariables = Exact<{ [key: string]: never; }>;


export type RidesMissingWeatherQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, ridesMissingWeather: number } | null };

export type UpdateBikeAcquisitionMutationVariables = Exact<{
  bikeId: Scalars['ID']['input'];
  input: UpdateBikeAcquisitionInput;
}>;


export type UpdateBikeAcquisitionMutation = { __typename?: 'Mutation', updateBikeAcquisition: { __typename?: 'UpdateBikeAcquisitionResult', installsMoved: number, serviceLogsMoved: number, bike: { __typename?: 'Bike', id: string, acquisitionDate?: string | null } } };

export type BulkUpdateBikeComponentInstallsMutationVariables = Exact<{
  input: BulkUpdateBikeComponentInstallsInput;
}>;


export type BulkUpdateBikeComponentInstallsMutation = { __typename?: 'Mutation', bulkUpdateBikeComponentInstalls: { __typename?: 'BulkUpdateBikeComponentInstallsResult', updatedCount: number, serviceLogsMoved: number } };

export type BikeHistoryQueryVariables = Exact<{
  bikeId: Scalars['ID']['input'];
  startDate?: InputMaybe<Scalars['String']['input']>;
  endDate?: InputMaybe<Scalars['String']['input']>;
}>;


export type BikeHistoryQuery = { __typename?: 'Query', bikeHistory: { __typename?: 'BikeHistoryPayload', truncated: boolean, bike: { __typename?: 'Bike', id: string, nickname?: string | null, manufacturer: string, model: string, year?: number | null }, rides: Array<{ __typename?: 'Ride', id: string, startTime: string, durationSeconds: number, distanceMeters: number, elevationGainMeters: number, averageHr?: number | null, rideType: string, trailSystem?: string | null, location?: string | null }>, serviceEvents: Array<{ __typename?: 'ServiceEvent', id: string, performedAt: string, notes?: string | null, hoursAtService: number, component: { __typename?: 'Component', id: string, type: ComponentType, location: ComponentLocation, brand: string, model: string } }>, installs: Array<{ __typename?: 'ComponentInstallEvent', id: string, eventType: ComponentInstallEventType, occurredAt: string, component: { __typename?: 'Component', id: string, type: ComponentType, location: ComponentLocation, brand: string, model: string } }>, totals: { __typename?: 'BikeHistoryTotals', rideCount: number, totalDistanceMeters: number, totalDurationSeconds: number, totalElevationGainMeters: number, serviceEventCount: number, installEventCount: number } } };

export type CreateCheckoutSessionMutationVariables = Exact<{
  plan: StripePlan;
  platform?: InputMaybe<CheckoutPlatform>;
}>;


export type CreateCheckoutSessionMutation = { __typename?: 'Mutation', createCheckoutSession: { __typename?: 'CheckoutSessionResult', sessionId: string, url?: string | null } };

export type CreateBillingPortalSessionMutationVariables = Exact<{
  platform?: InputMaybe<CheckoutPlatform>;
}>;


export type CreateBillingPortalSessionMutation = { __typename?: 'Mutation', createBillingPortalSession: { __typename?: 'BillingPortalResult', url: string } };

export type CalibrationStateQueryVariables = Exact<{ [key: string]: never; }>;


export type CalibrationStateQuery = { __typename?: 'Query', calibrationState?: { __typename?: 'CalibrationState', showOverlay: boolean, overdueCount: number, totalComponentCount: number, bikes: Array<{ __typename?: 'BikeCalibrationInfo', bikeId: string, bikeName: string, thumbnailUrl?: string | null, components: Array<{ __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number }> }> } | null };

export type LogBulkComponentServiceMutationVariables = Exact<{
  input: BulkServiceLogInput;
}>;


export type LogBulkComponentServiceMutation = { __typename?: 'Mutation', logBulkComponentService: { __typename?: 'BulkServiceResult', success: boolean, updatedCount: number } };

export type DismissCalibrationMutationVariables = Exact<{ [key: string]: never; }>;


export type DismissCalibrationMutation = { __typename?: 'Mutation', dismissCalibration: { __typename?: 'User', id: string } };

export type CompleteCalibrationMutationVariables = Exact<{ [key: string]: never; }>;


export type CompleteCalibrationMutation = { __typename?: 'Mutation', completeCalibration: { __typename?: 'User', id: string } };

export type UpdateBikeComponentInstallMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateBikeComponentInstallInput;
}>;


export type UpdateBikeComponentInstallMutation = { __typename?: 'Mutation', updateBikeComponentInstall: { __typename?: 'BikeComponentInstall', id: string, installedAt: string, removedAt?: string | null } };

export type DeleteBikeComponentInstallMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteBikeComponentInstallMutation = { __typename?: 'Mutation', deleteBikeComponentInstall: boolean };

export type DeleteRideMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteRideMutation = { __typename?: 'Mutation', deleteRide: { __typename?: 'DeleteRideResult', ok: boolean, id: string } };

export type ComponentFieldsFragment = { __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus, serviceLogs: Array<{ __typename?: 'ServiceLog', id: string, performedAt: string, notes?: string | null, hoursAtService: number }> };

export type PredictionFieldsFragment = { __typename?: 'BikePredictionSummary', bikeId: string, bikeName: string, overallStatus: PredictionStatus, dueNowCount: number, dueSoonCount: number, generatedAt: string, priorityComponent?: { __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number } | null, components: Array<{ __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number }> };

export type BikeFieldsLightFragment = { __typename?: 'Bike', id: string, nickname?: string | null, manufacturer: string, model: string, year?: number | null, travelForkMm?: number | null, travelShockMm?: number | null, notes?: string | null, spokesId?: string | null, spokesUrl?: string | null, thumbnailUrl?: string | null, family?: string | null, category?: string | null, subcategory?: string | null, buildKind?: string | null, isFrameset?: boolean | null, isEbike?: boolean | null, gender?: string | null, frameMaterial?: string | null, hangerStandard?: string | null, motorMaker?: string | null, motorModel?: string | null, motorPowerW?: number | null, motorTorqueNm?: number | null, batteryWh?: number | null, acquisitionCondition?: AcquisitionCondition | null, acquisitionDate?: string | null, status: BikeStatus, retiredAt?: string | null, createdAt: string, updatedAt: string, components: Array<{ __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus, serviceLogs: Array<{ __typename?: 'ServiceLog', id: string, performedAt: string, notes?: string | null, hoursAtService: number }> }> };

export type BikeNotificationPreferenceFieldsFragment = { __typename?: 'BikeNotificationPreference', bikeId: string, serviceNotificationsEnabled: boolean, serviceNotificationMode: ServiceNotificationMode, serviceNotificationThreshold: number };

export type BikeFieldsFragment = { __typename?: 'Bike', id: string, nickname?: string | null, manufacturer: string, model: string, year?: number | null, travelForkMm?: number | null, travelShockMm?: number | null, notes?: string | null, spokesId?: string | null, spokesUrl?: string | null, thumbnailUrl?: string | null, family?: string | null, category?: string | null, subcategory?: string | null, buildKind?: string | null, isFrameset?: boolean | null, isEbike?: boolean | null, gender?: string | null, frameMaterial?: string | null, hangerStandard?: string | null, motorMaker?: string | null, motorModel?: string | null, motorPowerW?: number | null, motorTorqueNm?: number | null, batteryWh?: number | null, acquisitionCondition?: AcquisitionCondition | null, acquisitionDate?: string | null, status: BikeStatus, retiredAt?: string | null, createdAt: string, updatedAt: string, components: Array<{ __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus, serviceLogs: Array<{ __typename?: 'ServiceLog', id: string, performedAt: string, notes?: string | null, hoursAtService: number }> }>, predictions?: { __typename?: 'BikePredictionSummary', bikeId: string, bikeName: string, overallStatus: PredictionStatus, dueNowCount: number, dueSoonCount: number, generatedAt: string, priorityComponent?: { __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number } | null, components: Array<{ __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number }> } | null, notificationPreference?: { __typename?: 'BikeNotificationPreference', bikeId: string, serviceNotificationsEnabled: boolean, serviceNotificationMode: ServiceNotificationMode, serviceNotificationThreshold: number } | null };

export type GearLightQueryVariables = Exact<{ [key: string]: never; }>;


export type GearLightQuery = { __typename?: 'Query', bikes: Array<{ __typename?: 'Bike', id: string, nickname?: string | null, manufacturer: string, model: string, year?: number | null, travelForkMm?: number | null, travelShockMm?: number | null, notes?: string | null, spokesId?: string | null, spokesUrl?: string | null, thumbnailUrl?: string | null, family?: string | null, category?: string | null, subcategory?: string | null, buildKind?: string | null, isFrameset?: boolean | null, isEbike?: boolean | null, gender?: string | null, frameMaterial?: string | null, hangerStandard?: string | null, motorMaker?: string | null, motorModel?: string | null, motorPowerW?: number | null, motorTorqueNm?: number | null, batteryWh?: number | null, acquisitionCondition?: AcquisitionCondition | null, acquisitionDate?: string | null, status: BikeStatus, retiredAt?: string | null, createdAt: string, updatedAt: string, components: Array<{ __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus, serviceLogs: Array<{ __typename?: 'ServiceLog', id: string, performedAt: string, notes?: string | null, hoursAtService: number }> }> }>, allBikes: Array<{ __typename?: 'Bike', id: string, nickname?: string | null, manufacturer: string, model: string, year?: number | null, travelForkMm?: number | null, travelShockMm?: number | null, notes?: string | null, spokesId?: string | null, spokesUrl?: string | null, thumbnailUrl?: string | null, family?: string | null, category?: string | null, subcategory?: string | null, buildKind?: string | null, isFrameset?: boolean | null, isEbike?: boolean | null, gender?: string | null, frameMaterial?: string | null, hangerStandard?: string | null, motorMaker?: string | null, motorModel?: string | null, motorPowerW?: number | null, motorTorqueNm?: number | null, batteryWh?: number | null, acquisitionCondition?: AcquisitionCondition | null, acquisitionDate?: string | null, status: BikeStatus, retiredAt?: string | null, createdAt: string, updatedAt: string, components: Array<{ __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus, serviceLogs: Array<{ __typename?: 'ServiceLog', id: string, performedAt: string, notes?: string | null, hoursAtService: number }> }> }>, spareComponents: Array<{ __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus, serviceLogs: Array<{ __typename?: 'ServiceLog', id: string, performedAt: string, notes?: string | null, hoursAtService: number }> }> };

export type GearQueryVariables = Exact<{ [key: string]: never; }>;


export type GearQuery = { __typename?: 'Query', bikes: Array<{ __typename?: 'Bike', id: string, nickname?: string | null, manufacturer: string, model: string, year?: number | null, travelForkMm?: number | null, travelShockMm?: number | null, notes?: string | null, spokesId?: string | null, spokesUrl?: string | null, thumbnailUrl?: string | null, family?: string | null, category?: string | null, subcategory?: string | null, buildKind?: string | null, isFrameset?: boolean | null, isEbike?: boolean | null, gender?: string | null, frameMaterial?: string | null, hangerStandard?: string | null, motorMaker?: string | null, motorModel?: string | null, motorPowerW?: number | null, motorTorqueNm?: number | null, batteryWh?: number | null, acquisitionCondition?: AcquisitionCondition | null, acquisitionDate?: string | null, status: BikeStatus, retiredAt?: string | null, createdAt: string, updatedAt: string, components: Array<{ __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus, serviceLogs: Array<{ __typename?: 'ServiceLog', id: string, performedAt: string, notes?: string | null, hoursAtService: number }> }>, predictions?: { __typename?: 'BikePredictionSummary', bikeId: string, bikeName: string, overallStatus: PredictionStatus, dueNowCount: number, dueSoonCount: number, generatedAt: string, priorityComponent?: { __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number } | null, components: Array<{ __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number }> } | null, notificationPreference?: { __typename?: 'BikeNotificationPreference', bikeId: string, serviceNotificationsEnabled: boolean, serviceNotificationMode: ServiceNotificationMode, serviceNotificationThreshold: number } | null }>, spareComponents: Array<{ __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus, serviceLogs: Array<{ __typename?: 'ServiceLog', id: string, performedAt: string, notes?: string | null, hoursAtService: number }> }> };

export type AddBikeMutationVariables = Exact<{
  input: AddBikeInput;
}>;


export type AddBikeMutation = { __typename?: 'Mutation', addBike: { __typename?: 'Bike', id: string, nickname?: string | null, manufacturer: string, model: string, year?: number | null, travelForkMm?: number | null, travelShockMm?: number | null, notes?: string | null, spokesId?: string | null, spokesUrl?: string | null, thumbnailUrl?: string | null, family?: string | null, category?: string | null, subcategory?: string | null, buildKind?: string | null, isFrameset?: boolean | null, isEbike?: boolean | null, gender?: string | null, frameMaterial?: string | null, hangerStandard?: string | null, motorMaker?: string | null, motorModel?: string | null, motorPowerW?: number | null, motorTorqueNm?: number | null, batteryWh?: number | null, acquisitionCondition?: AcquisitionCondition | null, acquisitionDate?: string | null, status: BikeStatus, retiredAt?: string | null, createdAt: string, updatedAt: string, components: Array<{ __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus, serviceLogs: Array<{ __typename?: 'ServiceLog', id: string, performedAt: string, notes?: string | null, hoursAtService: number }> }>, predictions?: { __typename?: 'BikePredictionSummary', bikeId: string, bikeName: string, overallStatus: PredictionStatus, dueNowCount: number, dueSoonCount: number, generatedAt: string, priorityComponent?: { __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number } | null, components: Array<{ __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number }> } | null, notificationPreference?: { __typename?: 'BikeNotificationPreference', bikeId: string, serviceNotificationsEnabled: boolean, serviceNotificationMode: ServiceNotificationMode, serviceNotificationThreshold: number } | null } };

export type UpdateBikeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateBikeInput;
}>;


export type UpdateBikeMutation = { __typename?: 'Mutation', updateBike: { __typename?: 'Bike', id: string, nickname?: string | null, manufacturer: string, model: string, year?: number | null, travelForkMm?: number | null, travelShockMm?: number | null, notes?: string | null, spokesId?: string | null, spokesUrl?: string | null, thumbnailUrl?: string | null, family?: string | null, category?: string | null, subcategory?: string | null, buildKind?: string | null, isFrameset?: boolean | null, isEbike?: boolean | null, gender?: string | null, frameMaterial?: string | null, hangerStandard?: string | null, motorMaker?: string | null, motorModel?: string | null, motorPowerW?: number | null, motorTorqueNm?: number | null, batteryWh?: number | null, acquisitionCondition?: AcquisitionCondition | null, acquisitionDate?: string | null, status: BikeStatus, retiredAt?: string | null, createdAt: string, updatedAt: string, components: Array<{ __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus, serviceLogs: Array<{ __typename?: 'ServiceLog', id: string, performedAt: string, notes?: string | null, hoursAtService: number }> }>, predictions?: { __typename?: 'BikePredictionSummary', bikeId: string, bikeName: string, overallStatus: PredictionStatus, dueNowCount: number, dueSoonCount: number, generatedAt: string, priorityComponent?: { __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number } | null, components: Array<{ __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number }> } | null, notificationPreference?: { __typename?: 'BikeNotificationPreference', bikeId: string, serviceNotificationsEnabled: boolean, serviceNotificationMode: ServiceNotificationMode, serviceNotificationThreshold: number } | null } };

export type DeleteBikeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteBikeMutation = { __typename?: 'Mutation', deleteBike: { __typename?: 'DeleteResult', ok: boolean, id: string } };

export type RetireBikeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  status: BikeStatus;
}>;


export type RetireBikeMutation = { __typename?: 'Mutation', retireBike: { __typename?: 'Bike', id: string, nickname?: string | null, manufacturer: string, model: string, year?: number | null, travelForkMm?: number | null, travelShockMm?: number | null, notes?: string | null, spokesId?: string | null, spokesUrl?: string | null, thumbnailUrl?: string | null, family?: string | null, category?: string | null, subcategory?: string | null, buildKind?: string | null, isFrameset?: boolean | null, isEbike?: boolean | null, gender?: string | null, frameMaterial?: string | null, hangerStandard?: string | null, motorMaker?: string | null, motorModel?: string | null, motorPowerW?: number | null, motorTorqueNm?: number | null, batteryWh?: number | null, acquisitionCondition?: AcquisitionCondition | null, acquisitionDate?: string | null, status: BikeStatus, retiredAt?: string | null, createdAt: string, updatedAt: string, components: Array<{ __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus, serviceLogs: Array<{ __typename?: 'ServiceLog', id: string, performedAt: string, notes?: string | null, hoursAtService: number }> }>, predictions?: { __typename?: 'BikePredictionSummary', bikeId: string, bikeName: string, overallStatus: PredictionStatus, dueNowCount: number, dueSoonCount: number, generatedAt: string, priorityComponent?: { __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number } | null, components: Array<{ __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number }> } | null, notificationPreference?: { __typename?: 'BikeNotificationPreference', bikeId: string, serviceNotificationsEnabled: boolean, serviceNotificationMode: ServiceNotificationMode, serviceNotificationThreshold: number } | null } };

export type ReactivateBikeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ReactivateBikeMutation = { __typename?: 'Mutation', reactivateBike: { __typename?: 'Bike', id: string, nickname?: string | null, manufacturer: string, model: string, year?: number | null, travelForkMm?: number | null, travelShockMm?: number | null, notes?: string | null, spokesId?: string | null, spokesUrl?: string | null, thumbnailUrl?: string | null, family?: string | null, category?: string | null, subcategory?: string | null, buildKind?: string | null, isFrameset?: boolean | null, isEbike?: boolean | null, gender?: string | null, frameMaterial?: string | null, hangerStandard?: string | null, motorMaker?: string | null, motorModel?: string | null, motorPowerW?: number | null, motorTorqueNm?: number | null, batteryWh?: number | null, acquisitionCondition?: AcquisitionCondition | null, acquisitionDate?: string | null, status: BikeStatus, retiredAt?: string | null, createdAt: string, updatedAt: string, components: Array<{ __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus, serviceLogs: Array<{ __typename?: 'ServiceLog', id: string, performedAt: string, notes?: string | null, hoursAtService: number }> }>, predictions?: { __typename?: 'BikePredictionSummary', bikeId: string, bikeName: string, overallStatus: PredictionStatus, dueNowCount: number, dueSoonCount: number, generatedAt: string, priorityComponent?: { __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number } | null, components: Array<{ __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number }> } | null, notificationPreference?: { __typename?: 'BikeNotificationPreference', bikeId: string, serviceNotificationsEnabled: boolean, serviceNotificationMode: ServiceNotificationMode, serviceNotificationThreshold: number } | null } };

export type UpdateComponentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateComponentInput;
}>;


export type UpdateComponentMutation = { __typename?: 'Mutation', updateComponent: { __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus, serviceLogs: Array<{ __typename?: 'ServiceLog', id: string, performedAt: string, notes?: string | null, hoursAtService: number }> } };

export type LogComponentServiceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  performedAt?: InputMaybe<Scalars['String']['input']>;
}>;


export type LogComponentServiceMutation = { __typename?: 'Mutation', logComponentService: { __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus, serviceLogs: Array<{ __typename?: 'ServiceLog', id: string, performedAt: string, notes?: string | null, hoursAtService: number }> } };

export type InstallComponentMutationVariables = Exact<{
  input: InstallComponentInput;
}>;


export type InstallComponentMutation = { __typename?: 'Mutation', installComponent: { __typename?: 'InstallComponentResult', installedComponent: { __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus, serviceLogs: Array<{ __typename?: 'ServiceLog', id: string, performedAt: string, notes?: string | null, hoursAtService: number }> }, displacedComponent?: { __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus, serviceLogs: Array<{ __typename?: 'ServiceLog', id: string, performedAt: string, notes?: string | null, hoursAtService: number }> } | null } };

export type SnoozeComponentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  hours?: InputMaybe<Scalars['Float']['input']>;
}>;


export type SnoozeComponentMutation = { __typename?: 'Mutation', snoozeComponent: { __typename?: 'Component', id: string, serviceDueAtHours?: number | null } };

export type UpdateBikeNotificationPreferenceMutationVariables = Exact<{
  input: UpdateBikeNotificationPreferenceInput;
}>;


export type UpdateBikeNotificationPreferenceMutation = { __typename?: 'Mutation', updateBikeNotificationPreference: { __typename?: 'BikeNotificationPreference', bikeId: string, serviceNotificationsEnabled: boolean, serviceNotificationMode: ServiceNotificationMode, serviceNotificationThreshold: number } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, email: string, name?: string | null, avatarUrl?: string | null, onboardingCompleted: boolean, hasAcceptedCurrentTerms: boolean, location?: string | null, age?: number | null, role: UserRole, mustChangePassword: boolean, isFoundingRider: boolean, hoursDisplayPreference?: string | null, predictionMode?: string | null, distanceUnit?: string | null, notifyOnRideUpload: boolean, pairedComponentMigrationSeenAt?: string | null, createdAt: string, activeDataSource?: string | null, subscriptionTier: SubscriptionTier, subscriptionProvider?: SubscriptionProvider | null, referralCode?: string | null, needsDowngradeSelection: boolean, tierLimits: { __typename?: 'TierLimits', maxBikes?: number | null, allowedComponentTypes: Array<ComponentType>, currentBikeCount: number, canAddBike: boolean }, accounts: Array<{ __typename?: 'ConnectedAccount', provider: string, connectedAt: string }> } | null };

export type ReferralStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type ReferralStatsQuery = { __typename?: 'Query', referralStats: { __typename?: 'ReferralStats', referralCode: string, referralLink: string, pendingCount: number, completedCount: number } };

export type RecentRidesQueryVariables = Exact<{
  take?: InputMaybe<Scalars['Int']['input']>;
}>;


export type RecentRidesQuery = { __typename?: 'Query', rides: Array<{ __typename?: 'Ride', id: string, startTime: string, durationSeconds: number, distanceMeters: number, elevationGainMeters: number, rideType: string, bikeId?: string | null, location?: string | null, weather?: { __typename?: 'RideWeather', id: string, tempC: number, condition: WeatherCondition } | null }> };

export type RidesPageQueryVariables = Exact<{
  take?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['ID']['input']>;
  filter?: InputMaybe<RidesFilterInput>;
}>;


export type RidesPageQuery = { __typename?: 'Query', rides: Array<{ __typename?: 'Ride', id: string, startTime: string, durationSeconds: number, distanceMeters: number, elevationGainMeters: number, averageHr?: number | null, rideType: string, bikeId?: string | null, location?: string | null, notes?: string | null, garminActivityId?: string | null, stravaActivityId?: string | null, whoopWorkoutId?: string | null, suuntoWorkoutId?: string | null, weather?: { __typename?: 'RideWeather', id: string, tempC: number, feelsLikeC?: number | null, precipitationMm: number, windSpeedKph: number, humidity?: number | null, wmoCode: number, condition: WeatherCondition } | null }> };

export type UpdateServiceLogMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateServiceLogInput;
}>;


export type UpdateServiceLogMutation = { __typename?: 'Mutation', updateServiceLog: { __typename?: 'ServiceLog', id: string, performedAt: string, notes?: string | null, hoursAtService: number } };

export type DeleteServiceLogMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteServiceLogMutation = { __typename?: 'Mutation', deleteServiceLog: boolean };

export type UnmappedStravaGearsQueryVariables = Exact<{ [key: string]: never; }>;


export type UnmappedStravaGearsQuery = { __typename?: 'Query', unmappedStravaGears: Array<{ __typename?: 'StravaGearInfo', gearId: string, gearName?: string | null, rideCount: number, isMapped: boolean }> };

export type StravaGearMappingsQueryVariables = Exact<{ [key: string]: never; }>;


export type StravaGearMappingsQuery = { __typename?: 'Query', stravaGearMappings: Array<{ __typename?: 'StravaGearMapping', id: string, stravaGearId: string, stravaGearName?: string | null, bikeId: string, createdAt: string, bike: { __typename?: 'Bike', id: string, nickname?: string | null, manufacturer: string, model: string } }> };

export type CreateStravaGearMappingMutationVariables = Exact<{
  input: CreateStravaGearMappingInput;
}>;


export type CreateStravaGearMappingMutation = { __typename?: 'Mutation', createStravaGearMapping: { __typename?: 'StravaGearMapping', id: string, stravaGearId: string, stravaGearName?: string | null, bikeId: string } };

export type DeleteStravaGearMappingMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteStravaGearMappingMutation = { __typename?: 'Mutation', deleteStravaGearMapping: { __typename?: 'DeleteResult', ok: boolean, id: string } };

export type UpdateRideMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateRideInput;
}>;


export type UpdateRideMutation = { __typename?: 'Mutation', updateRide: { __typename?: 'Ride', id: string, startTime: string, durationSeconds: number, distanceMeters: number, elevationGainMeters: number, rideType: string, bikeId?: string | null, location?: string | null, notes?: string | null } };

export type UpdateUserPreferencesMutationVariables = Exact<{
  input: UpdateUserPreferencesInput;
}>;


export type UpdateUserPreferencesMutation = { __typename?: 'Mutation', updateUserPreferences: { __typename?: 'User', id: string, hoursDisplayPreference?: string | null, predictionMode?: string | null, distanceUnit?: string | null, notifyOnRideUpload: boolean } };

export type WeatherBreakdownQueryVariables = Exact<{
  filter?: InputMaybe<RidesFilterInput>;
}>;


export type WeatherBreakdownQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, weatherBreakdown: { __typename?: 'WeatherBreakdown', sunny: number, cloudy: number, rainy: number, snowy: number, windy: number, foggy: number, unknown: number, pending: number, totalRides: number } } | null };

export const ComponentFieldsFragmentDoc = gql`
    fragment ComponentFields on Component {
  id
  type
  brand
  model
  notes
  isStock
  bikeId
  hoursUsed
  serviceDueAtHours
  baselineWearPercent
  baselineMethod
  baselineConfidence
  baselineSetAt
  lastServicedAt
  location
  status
  serviceLogs {
    id
    performedAt
    notes
    hoursAtService
  }
}
    `;
export const BikeFieldsLightFragmentDoc = gql`
    fragment BikeFieldsLight on Bike {
  id
  nickname
  manufacturer
  model
  year
  travelForkMm
  travelShockMm
  notes
  spokesId
  spokesUrl
  thumbnailUrl
  family
  category
  subcategory
  buildKind
  isFrameset
  isEbike
  gender
  frameMaterial
  hangerStandard
  motorMaker
  motorModel
  motorPowerW
  motorTorqueNm
  batteryWh
  acquisitionCondition
  acquisitionDate
  status
  retiredAt
  components {
    ...ComponentFields
  }
  createdAt
  updatedAt
}
    ${ComponentFieldsFragmentDoc}`;
export const PredictionFieldsFragmentDoc = gql`
    fragment PredictionFields on BikePredictionSummary {
  bikeId
  bikeName
  overallStatus
  dueNowCount
  dueSoonCount
  generatedAt
  priorityComponent {
    componentId
    componentType
    location
    brand
    model
    status
    hoursRemaining
    ridesRemainingEstimate
    confidence
    currentHours
    serviceIntervalHours
    hoursSinceService
  }
  components {
    componentId
    componentType
    location
    brand
    model
    status
    hoursRemaining
    ridesRemainingEstimate
    confidence
    currentHours
    serviceIntervalHours
    hoursSinceService
  }
}
    `;
export const BikeNotificationPreferenceFieldsFragmentDoc = gql`
    fragment BikeNotificationPreferenceFields on BikeNotificationPreference {
  bikeId
  serviceNotificationsEnabled
  serviceNotificationMode
  serviceNotificationThreshold
}
    `;
export const BikeFieldsFragmentDoc = gql`
    fragment BikeFields on Bike {
  id
  nickname
  manufacturer
  model
  year
  travelForkMm
  travelShockMm
  notes
  spokesId
  spokesUrl
  thumbnailUrl
  family
  category
  subcategory
  buildKind
  isFrameset
  isEbike
  gender
  frameMaterial
  hangerStandard
  motorMaker
  motorModel
  motorPowerW
  motorTorqueNm
  batteryWh
  acquisitionCondition
  acquisitionDate
  status
  retiredAt
  components {
    ...ComponentFields
  }
  predictions {
    ...PredictionFields
  }
  notificationPreference {
    ...BikeNotificationPreferenceFields
  }
  createdAt
  updatedAt
}
    ${ComponentFieldsFragmentDoc}
${PredictionFieldsFragmentDoc}
${BikeNotificationPreferenceFieldsFragmentDoc}`;
export const AcceptTermsDocument = gql`
    mutation AcceptTerms($input: AcceptTermsInput!) {
  acceptTerms(input: $input) {
    success
    acceptedAt
  }
}
    `;
export type AcceptTermsMutationFn = Apollo.MutationFunction<AcceptTermsMutation, AcceptTermsMutationVariables>;

/**
 * __useAcceptTermsMutation__
 *
 * To run a mutation, you first call `useAcceptTermsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAcceptTermsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [acceptTermsMutation, { data, loading, error }] = useAcceptTermsMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAcceptTermsMutation(baseOptions?: Apollo.MutationHookOptions<AcceptTermsMutation, AcceptTermsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AcceptTermsMutation, AcceptTermsMutationVariables>(AcceptTermsDocument, options);
      }
export type AcceptTermsMutationHookResult = ReturnType<typeof useAcceptTermsMutation>;
export type AcceptTermsMutationResult = Apollo.MutationResult<AcceptTermsMutation>;
export type AcceptTermsMutationOptions = Apollo.BaseMutationOptions<AcceptTermsMutation, AcceptTermsMutationVariables>;
export const AddRideDocument = gql`
    mutation AddRide($input: AddRideInput!) {
  addRide(input: $input) {
    id
    startTime
    durationSeconds
    distanceMeters
    elevationGainMeters
    rideType
    bikeId
    location
    notes
  }
}
    `;
export type AddRideMutationFn = Apollo.MutationFunction<AddRideMutation, AddRideMutationVariables>;

/**
 * __useAddRideMutation__
 *
 * To run a mutation, you first call `useAddRideMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddRideMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addRideMutation, { data, loading, error }] = useAddRideMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddRideMutation(baseOptions?: Apollo.MutationHookOptions<AddRideMutation, AddRideMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddRideMutation, AddRideMutationVariables>(AddRideDocument, options);
      }
export type AddRideMutationHookResult = ReturnType<typeof useAddRideMutation>;
export type AddRideMutationResult = Apollo.MutationResult<AddRideMutation>;
export type AddRideMutationOptions = Apollo.BaseMutationOptions<AddRideMutation, AddRideMutationVariables>;
export const BackfillWeatherForMyRidesDocument = gql`
    mutation BackfillWeatherForMyRides {
  backfillWeatherForMyRides {
    enqueuedCount
    ridesWithoutCoords
    remainingAfterBatch
  }
}
    `;
export type BackfillWeatherForMyRidesMutationFn = Apollo.MutationFunction<BackfillWeatherForMyRidesMutation, BackfillWeatherForMyRidesMutationVariables>;

/**
 * __useBackfillWeatherForMyRidesMutation__
 *
 * To run a mutation, you first call `useBackfillWeatherForMyRidesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useBackfillWeatherForMyRidesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [backfillWeatherForMyRidesMutation, { data, loading, error }] = useBackfillWeatherForMyRidesMutation({
 *   variables: {
 *   },
 * });
 */
export function useBackfillWeatherForMyRidesMutation(baseOptions?: Apollo.MutationHookOptions<BackfillWeatherForMyRidesMutation, BackfillWeatherForMyRidesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<BackfillWeatherForMyRidesMutation, BackfillWeatherForMyRidesMutationVariables>(BackfillWeatherForMyRidesDocument, options);
      }
export type BackfillWeatherForMyRidesMutationHookResult = ReturnType<typeof useBackfillWeatherForMyRidesMutation>;
export type BackfillWeatherForMyRidesMutationResult = Apollo.MutationResult<BackfillWeatherForMyRidesMutation>;
export type BackfillWeatherForMyRidesMutationOptions = Apollo.BaseMutationOptions<BackfillWeatherForMyRidesMutation, BackfillWeatherForMyRidesMutationVariables>;
export const RidesMissingWeatherDocument = gql`
    query RidesMissingWeather {
  me {
    id
    ridesMissingWeather
  }
}
    `;

/**
 * __useRidesMissingWeatherQuery__
 *
 * To run a query within a React component, call `useRidesMissingWeatherQuery` and pass it any options that fit your needs.
 * When your component renders, `useRidesMissingWeatherQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRidesMissingWeatherQuery({
 *   variables: {
 *   },
 * });
 */
export function useRidesMissingWeatherQuery(baseOptions?: Apollo.QueryHookOptions<RidesMissingWeatherQuery, RidesMissingWeatherQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RidesMissingWeatherQuery, RidesMissingWeatherQueryVariables>(RidesMissingWeatherDocument, options);
      }
export function useRidesMissingWeatherLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RidesMissingWeatherQuery, RidesMissingWeatherQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RidesMissingWeatherQuery, RidesMissingWeatherQueryVariables>(RidesMissingWeatherDocument, options);
        }
// @ts-ignore
export function useRidesMissingWeatherSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<RidesMissingWeatherQuery, RidesMissingWeatherQueryVariables>): Apollo.UseSuspenseQueryResult<RidesMissingWeatherQuery, RidesMissingWeatherQueryVariables>;
export function useRidesMissingWeatherSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<RidesMissingWeatherQuery, RidesMissingWeatherQueryVariables>): Apollo.UseSuspenseQueryResult<RidesMissingWeatherQuery | undefined, RidesMissingWeatherQueryVariables>;
export function useRidesMissingWeatherSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<RidesMissingWeatherQuery, RidesMissingWeatherQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<RidesMissingWeatherQuery, RidesMissingWeatherQueryVariables>(RidesMissingWeatherDocument, options);
        }
export type RidesMissingWeatherQueryHookResult = ReturnType<typeof useRidesMissingWeatherQuery>;
export type RidesMissingWeatherLazyQueryHookResult = ReturnType<typeof useRidesMissingWeatherLazyQuery>;
export type RidesMissingWeatherSuspenseQueryHookResult = ReturnType<typeof useRidesMissingWeatherSuspenseQuery>;
export type RidesMissingWeatherQueryResult = Apollo.QueryResult<RidesMissingWeatherQuery, RidesMissingWeatherQueryVariables>;
export const UpdateBikeAcquisitionDocument = gql`
    mutation UpdateBikeAcquisition($bikeId: ID!, $input: UpdateBikeAcquisitionInput!) {
  updateBikeAcquisition(bikeId: $bikeId, input: $input) {
    bike {
      id
      acquisitionDate
    }
    installsMoved
    serviceLogsMoved
  }
}
    `;
export type UpdateBikeAcquisitionMutationFn = Apollo.MutationFunction<UpdateBikeAcquisitionMutation, UpdateBikeAcquisitionMutationVariables>;

/**
 * __useUpdateBikeAcquisitionMutation__
 *
 * To run a mutation, you first call `useUpdateBikeAcquisitionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateBikeAcquisitionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateBikeAcquisitionMutation, { data, loading, error }] = useUpdateBikeAcquisitionMutation({
 *   variables: {
 *      bikeId: // value for 'bikeId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateBikeAcquisitionMutation(baseOptions?: Apollo.MutationHookOptions<UpdateBikeAcquisitionMutation, UpdateBikeAcquisitionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateBikeAcquisitionMutation, UpdateBikeAcquisitionMutationVariables>(UpdateBikeAcquisitionDocument, options);
      }
export type UpdateBikeAcquisitionMutationHookResult = ReturnType<typeof useUpdateBikeAcquisitionMutation>;
export type UpdateBikeAcquisitionMutationResult = Apollo.MutationResult<UpdateBikeAcquisitionMutation>;
export type UpdateBikeAcquisitionMutationOptions = Apollo.BaseMutationOptions<UpdateBikeAcquisitionMutation, UpdateBikeAcquisitionMutationVariables>;
export const BulkUpdateBikeComponentInstallsDocument = gql`
    mutation BulkUpdateBikeComponentInstalls($input: BulkUpdateBikeComponentInstallsInput!) {
  bulkUpdateBikeComponentInstalls(input: $input) {
    updatedCount
    serviceLogsMoved
  }
}
    `;
export type BulkUpdateBikeComponentInstallsMutationFn = Apollo.MutationFunction<BulkUpdateBikeComponentInstallsMutation, BulkUpdateBikeComponentInstallsMutationVariables>;

/**
 * __useBulkUpdateBikeComponentInstallsMutation__
 *
 * To run a mutation, you first call `useBulkUpdateBikeComponentInstallsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useBulkUpdateBikeComponentInstallsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [bulkUpdateBikeComponentInstallsMutation, { data, loading, error }] = useBulkUpdateBikeComponentInstallsMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useBulkUpdateBikeComponentInstallsMutation(baseOptions?: Apollo.MutationHookOptions<BulkUpdateBikeComponentInstallsMutation, BulkUpdateBikeComponentInstallsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<BulkUpdateBikeComponentInstallsMutation, BulkUpdateBikeComponentInstallsMutationVariables>(BulkUpdateBikeComponentInstallsDocument, options);
      }
export type BulkUpdateBikeComponentInstallsMutationHookResult = ReturnType<typeof useBulkUpdateBikeComponentInstallsMutation>;
export type BulkUpdateBikeComponentInstallsMutationResult = Apollo.MutationResult<BulkUpdateBikeComponentInstallsMutation>;
export type BulkUpdateBikeComponentInstallsMutationOptions = Apollo.BaseMutationOptions<BulkUpdateBikeComponentInstallsMutation, BulkUpdateBikeComponentInstallsMutationVariables>;
export const BikeHistoryDocument = gql`
    query BikeHistory($bikeId: ID!, $startDate: String, $endDate: String) {
  bikeHistory(bikeId: $bikeId, startDate: $startDate, endDate: $endDate) {
    bike {
      id
      nickname
      manufacturer
      model
      year
    }
    rides {
      id
      startTime
      durationSeconds
      distanceMeters
      elevationGainMeters
      averageHr
      rideType
      trailSystem
      location
    }
    serviceEvents {
      id
      performedAt
      notes
      hoursAtService
      component {
        id
        type
        location
        brand
        model
      }
    }
    installs {
      id
      eventType
      occurredAt
      component {
        id
        type
        location
        brand
        model
      }
    }
    totals {
      rideCount
      totalDistanceMeters
      totalDurationSeconds
      totalElevationGainMeters
      serviceEventCount
      installEventCount
    }
    truncated
  }
}
    `;

/**
 * __useBikeHistoryQuery__
 *
 * To run a query within a React component, call `useBikeHistoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useBikeHistoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBikeHistoryQuery({
 *   variables: {
 *      bikeId: // value for 'bikeId'
 *      startDate: // value for 'startDate'
 *      endDate: // value for 'endDate'
 *   },
 * });
 */
export function useBikeHistoryQuery(baseOptions: Apollo.QueryHookOptions<BikeHistoryQuery, BikeHistoryQueryVariables> & ({ variables: BikeHistoryQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<BikeHistoryQuery, BikeHistoryQueryVariables>(BikeHistoryDocument, options);
      }
export function useBikeHistoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<BikeHistoryQuery, BikeHistoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<BikeHistoryQuery, BikeHistoryQueryVariables>(BikeHistoryDocument, options);
        }
// @ts-ignore
export function useBikeHistorySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<BikeHistoryQuery, BikeHistoryQueryVariables>): Apollo.UseSuspenseQueryResult<BikeHistoryQuery, BikeHistoryQueryVariables>;
export function useBikeHistorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<BikeHistoryQuery, BikeHistoryQueryVariables>): Apollo.UseSuspenseQueryResult<BikeHistoryQuery | undefined, BikeHistoryQueryVariables>;
export function useBikeHistorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<BikeHistoryQuery, BikeHistoryQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<BikeHistoryQuery, BikeHistoryQueryVariables>(BikeHistoryDocument, options);
        }
export type BikeHistoryQueryHookResult = ReturnType<typeof useBikeHistoryQuery>;
export type BikeHistoryLazyQueryHookResult = ReturnType<typeof useBikeHistoryLazyQuery>;
export type BikeHistorySuspenseQueryHookResult = ReturnType<typeof useBikeHistorySuspenseQuery>;
export type BikeHistoryQueryResult = Apollo.QueryResult<BikeHistoryQuery, BikeHistoryQueryVariables>;
export const CreateCheckoutSessionDocument = gql`
    mutation CreateCheckoutSession($plan: StripePlan!, $platform: CheckoutPlatform) {
  createCheckoutSession(plan: $plan, platform: $platform) {
    sessionId
    url
  }
}
    `;
export type CreateCheckoutSessionMutationFn = Apollo.MutationFunction<CreateCheckoutSessionMutation, CreateCheckoutSessionMutationVariables>;

/**
 * __useCreateCheckoutSessionMutation__
 *
 * To run a mutation, you first call `useCreateCheckoutSessionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCheckoutSessionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCheckoutSessionMutation, { data, loading, error }] = useCreateCheckoutSessionMutation({
 *   variables: {
 *      plan: // value for 'plan'
 *      platform: // value for 'platform'
 *   },
 * });
 */
export function useCreateCheckoutSessionMutation(baseOptions?: Apollo.MutationHookOptions<CreateCheckoutSessionMutation, CreateCheckoutSessionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateCheckoutSessionMutation, CreateCheckoutSessionMutationVariables>(CreateCheckoutSessionDocument, options);
      }
export type CreateCheckoutSessionMutationHookResult = ReturnType<typeof useCreateCheckoutSessionMutation>;
export type CreateCheckoutSessionMutationResult = Apollo.MutationResult<CreateCheckoutSessionMutation>;
export type CreateCheckoutSessionMutationOptions = Apollo.BaseMutationOptions<CreateCheckoutSessionMutation, CreateCheckoutSessionMutationVariables>;
export const CreateBillingPortalSessionDocument = gql`
    mutation CreateBillingPortalSession($platform: CheckoutPlatform) {
  createBillingPortalSession(platform: $platform) {
    url
  }
}
    `;
export type CreateBillingPortalSessionMutationFn = Apollo.MutationFunction<CreateBillingPortalSessionMutation, CreateBillingPortalSessionMutationVariables>;

/**
 * __useCreateBillingPortalSessionMutation__
 *
 * To run a mutation, you first call `useCreateBillingPortalSessionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateBillingPortalSessionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createBillingPortalSessionMutation, { data, loading, error }] = useCreateBillingPortalSessionMutation({
 *   variables: {
 *      platform: // value for 'platform'
 *   },
 * });
 */
export function useCreateBillingPortalSessionMutation(baseOptions?: Apollo.MutationHookOptions<CreateBillingPortalSessionMutation, CreateBillingPortalSessionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateBillingPortalSessionMutation, CreateBillingPortalSessionMutationVariables>(CreateBillingPortalSessionDocument, options);
      }
export type CreateBillingPortalSessionMutationHookResult = ReturnType<typeof useCreateBillingPortalSessionMutation>;
export type CreateBillingPortalSessionMutationResult = Apollo.MutationResult<CreateBillingPortalSessionMutation>;
export type CreateBillingPortalSessionMutationOptions = Apollo.BaseMutationOptions<CreateBillingPortalSessionMutation, CreateBillingPortalSessionMutationVariables>;
export const CalibrationStateDocument = gql`
    query CalibrationState {
  calibrationState {
    showOverlay
    overdueCount
    totalComponentCount
    bikes {
      bikeId
      bikeName
      thumbnailUrl
      components {
        componentId
        componentType
        location
        brand
        model
        status
        hoursRemaining
        ridesRemainingEstimate
        confidence
        currentHours
        serviceIntervalHours
        hoursSinceService
      }
    }
  }
}
    `;

/**
 * __useCalibrationStateQuery__
 *
 * To run a query within a React component, call `useCalibrationStateQuery` and pass it any options that fit your needs.
 * When your component renders, `useCalibrationStateQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCalibrationStateQuery({
 *   variables: {
 *   },
 * });
 */
export function useCalibrationStateQuery(baseOptions?: Apollo.QueryHookOptions<CalibrationStateQuery, CalibrationStateQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CalibrationStateQuery, CalibrationStateQueryVariables>(CalibrationStateDocument, options);
      }
export function useCalibrationStateLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CalibrationStateQuery, CalibrationStateQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CalibrationStateQuery, CalibrationStateQueryVariables>(CalibrationStateDocument, options);
        }
// @ts-ignore
export function useCalibrationStateSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CalibrationStateQuery, CalibrationStateQueryVariables>): Apollo.UseSuspenseQueryResult<CalibrationStateQuery, CalibrationStateQueryVariables>;
export function useCalibrationStateSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CalibrationStateQuery, CalibrationStateQueryVariables>): Apollo.UseSuspenseQueryResult<CalibrationStateQuery | undefined, CalibrationStateQueryVariables>;
export function useCalibrationStateSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CalibrationStateQuery, CalibrationStateQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CalibrationStateQuery, CalibrationStateQueryVariables>(CalibrationStateDocument, options);
        }
export type CalibrationStateQueryHookResult = ReturnType<typeof useCalibrationStateQuery>;
export type CalibrationStateLazyQueryHookResult = ReturnType<typeof useCalibrationStateLazyQuery>;
export type CalibrationStateSuspenseQueryHookResult = ReturnType<typeof useCalibrationStateSuspenseQuery>;
export type CalibrationStateQueryResult = Apollo.QueryResult<CalibrationStateQuery, CalibrationStateQueryVariables>;
export const LogBulkComponentServiceDocument = gql`
    mutation LogBulkComponentService($input: BulkServiceLogInput!) {
  logBulkComponentService(input: $input) {
    success
    updatedCount
  }
}
    `;
export type LogBulkComponentServiceMutationFn = Apollo.MutationFunction<LogBulkComponentServiceMutation, LogBulkComponentServiceMutationVariables>;

/**
 * __useLogBulkComponentServiceMutation__
 *
 * To run a mutation, you first call `useLogBulkComponentServiceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLogBulkComponentServiceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [logBulkComponentServiceMutation, { data, loading, error }] = useLogBulkComponentServiceMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useLogBulkComponentServiceMutation(baseOptions?: Apollo.MutationHookOptions<LogBulkComponentServiceMutation, LogBulkComponentServiceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LogBulkComponentServiceMutation, LogBulkComponentServiceMutationVariables>(LogBulkComponentServiceDocument, options);
      }
export type LogBulkComponentServiceMutationHookResult = ReturnType<typeof useLogBulkComponentServiceMutation>;
export type LogBulkComponentServiceMutationResult = Apollo.MutationResult<LogBulkComponentServiceMutation>;
export type LogBulkComponentServiceMutationOptions = Apollo.BaseMutationOptions<LogBulkComponentServiceMutation, LogBulkComponentServiceMutationVariables>;
export const DismissCalibrationDocument = gql`
    mutation DismissCalibration {
  dismissCalibration {
    id
  }
}
    `;
export type DismissCalibrationMutationFn = Apollo.MutationFunction<DismissCalibrationMutation, DismissCalibrationMutationVariables>;

/**
 * __useDismissCalibrationMutation__
 *
 * To run a mutation, you first call `useDismissCalibrationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDismissCalibrationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [dismissCalibrationMutation, { data, loading, error }] = useDismissCalibrationMutation({
 *   variables: {
 *   },
 * });
 */
export function useDismissCalibrationMutation(baseOptions?: Apollo.MutationHookOptions<DismissCalibrationMutation, DismissCalibrationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DismissCalibrationMutation, DismissCalibrationMutationVariables>(DismissCalibrationDocument, options);
      }
export type DismissCalibrationMutationHookResult = ReturnType<typeof useDismissCalibrationMutation>;
export type DismissCalibrationMutationResult = Apollo.MutationResult<DismissCalibrationMutation>;
export type DismissCalibrationMutationOptions = Apollo.BaseMutationOptions<DismissCalibrationMutation, DismissCalibrationMutationVariables>;
export const CompleteCalibrationDocument = gql`
    mutation CompleteCalibration {
  completeCalibration {
    id
  }
}
    `;
export type CompleteCalibrationMutationFn = Apollo.MutationFunction<CompleteCalibrationMutation, CompleteCalibrationMutationVariables>;

/**
 * __useCompleteCalibrationMutation__
 *
 * To run a mutation, you first call `useCompleteCalibrationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCompleteCalibrationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [completeCalibrationMutation, { data, loading, error }] = useCompleteCalibrationMutation({
 *   variables: {
 *   },
 * });
 */
export function useCompleteCalibrationMutation(baseOptions?: Apollo.MutationHookOptions<CompleteCalibrationMutation, CompleteCalibrationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CompleteCalibrationMutation, CompleteCalibrationMutationVariables>(CompleteCalibrationDocument, options);
      }
export type CompleteCalibrationMutationHookResult = ReturnType<typeof useCompleteCalibrationMutation>;
export type CompleteCalibrationMutationResult = Apollo.MutationResult<CompleteCalibrationMutation>;
export type CompleteCalibrationMutationOptions = Apollo.BaseMutationOptions<CompleteCalibrationMutation, CompleteCalibrationMutationVariables>;
export const UpdateBikeComponentInstallDocument = gql`
    mutation UpdateBikeComponentInstall($id: ID!, $input: UpdateBikeComponentInstallInput!) {
  updateBikeComponentInstall(id: $id, input: $input) {
    id
    installedAt
    removedAt
  }
}
    `;
export type UpdateBikeComponentInstallMutationFn = Apollo.MutationFunction<UpdateBikeComponentInstallMutation, UpdateBikeComponentInstallMutationVariables>;

/**
 * __useUpdateBikeComponentInstallMutation__
 *
 * To run a mutation, you first call `useUpdateBikeComponentInstallMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateBikeComponentInstallMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateBikeComponentInstallMutation, { data, loading, error }] = useUpdateBikeComponentInstallMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateBikeComponentInstallMutation(baseOptions?: Apollo.MutationHookOptions<UpdateBikeComponentInstallMutation, UpdateBikeComponentInstallMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateBikeComponentInstallMutation, UpdateBikeComponentInstallMutationVariables>(UpdateBikeComponentInstallDocument, options);
      }
export type UpdateBikeComponentInstallMutationHookResult = ReturnType<typeof useUpdateBikeComponentInstallMutation>;
export type UpdateBikeComponentInstallMutationResult = Apollo.MutationResult<UpdateBikeComponentInstallMutation>;
export type UpdateBikeComponentInstallMutationOptions = Apollo.BaseMutationOptions<UpdateBikeComponentInstallMutation, UpdateBikeComponentInstallMutationVariables>;
export const DeleteBikeComponentInstallDocument = gql`
    mutation DeleteBikeComponentInstall($id: ID!) {
  deleteBikeComponentInstall(id: $id)
}
    `;
export type DeleteBikeComponentInstallMutationFn = Apollo.MutationFunction<DeleteBikeComponentInstallMutation, DeleteBikeComponentInstallMutationVariables>;

/**
 * __useDeleteBikeComponentInstallMutation__
 *
 * To run a mutation, you first call `useDeleteBikeComponentInstallMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteBikeComponentInstallMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteBikeComponentInstallMutation, { data, loading, error }] = useDeleteBikeComponentInstallMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteBikeComponentInstallMutation(baseOptions?: Apollo.MutationHookOptions<DeleteBikeComponentInstallMutation, DeleteBikeComponentInstallMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteBikeComponentInstallMutation, DeleteBikeComponentInstallMutationVariables>(DeleteBikeComponentInstallDocument, options);
      }
export type DeleteBikeComponentInstallMutationHookResult = ReturnType<typeof useDeleteBikeComponentInstallMutation>;
export type DeleteBikeComponentInstallMutationResult = Apollo.MutationResult<DeleteBikeComponentInstallMutation>;
export type DeleteBikeComponentInstallMutationOptions = Apollo.BaseMutationOptions<DeleteBikeComponentInstallMutation, DeleteBikeComponentInstallMutationVariables>;
export const DeleteRideDocument = gql`
    mutation DeleteRide($id: ID!) {
  deleteRide(id: $id) {
    ok
    id
  }
}
    `;
export type DeleteRideMutationFn = Apollo.MutationFunction<DeleteRideMutation, DeleteRideMutationVariables>;

/**
 * __useDeleteRideMutation__
 *
 * To run a mutation, you first call `useDeleteRideMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteRideMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteRideMutation, { data, loading, error }] = useDeleteRideMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteRideMutation(baseOptions?: Apollo.MutationHookOptions<DeleteRideMutation, DeleteRideMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteRideMutation, DeleteRideMutationVariables>(DeleteRideDocument, options);
      }
export type DeleteRideMutationHookResult = ReturnType<typeof useDeleteRideMutation>;
export type DeleteRideMutationResult = Apollo.MutationResult<DeleteRideMutation>;
export type DeleteRideMutationOptions = Apollo.BaseMutationOptions<DeleteRideMutation, DeleteRideMutationVariables>;
export const GearLightDocument = gql`
    query GearLight {
  bikes {
    ...BikeFieldsLight
  }
  allBikes: bikes(includeInactive: true) {
    ...BikeFieldsLight
  }
  spareComponents: components(filter: {onlySpare: true}) {
    ...ComponentFields
  }
}
    ${BikeFieldsLightFragmentDoc}
${ComponentFieldsFragmentDoc}`;

/**
 * __useGearLightQuery__
 *
 * To run a query within a React component, call `useGearLightQuery` and pass it any options that fit your needs.
 * When your component renders, `useGearLightQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGearLightQuery({
 *   variables: {
 *   },
 * });
 */
export function useGearLightQuery(baseOptions?: Apollo.QueryHookOptions<GearLightQuery, GearLightQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GearLightQuery, GearLightQueryVariables>(GearLightDocument, options);
      }
export function useGearLightLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GearLightQuery, GearLightQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GearLightQuery, GearLightQueryVariables>(GearLightDocument, options);
        }
// @ts-ignore
export function useGearLightSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GearLightQuery, GearLightQueryVariables>): Apollo.UseSuspenseQueryResult<GearLightQuery, GearLightQueryVariables>;
export function useGearLightSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GearLightQuery, GearLightQueryVariables>): Apollo.UseSuspenseQueryResult<GearLightQuery | undefined, GearLightQueryVariables>;
export function useGearLightSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GearLightQuery, GearLightQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GearLightQuery, GearLightQueryVariables>(GearLightDocument, options);
        }
export type GearLightQueryHookResult = ReturnType<typeof useGearLightQuery>;
export type GearLightLazyQueryHookResult = ReturnType<typeof useGearLightLazyQuery>;
export type GearLightSuspenseQueryHookResult = ReturnType<typeof useGearLightSuspenseQuery>;
export type GearLightQueryResult = Apollo.QueryResult<GearLightQuery, GearLightQueryVariables>;
export const GearDocument = gql`
    query Gear {
  bikes(includeInactive: true) {
    ...BikeFields
  }
  spareComponents: components(filter: {onlySpare: true}) {
    ...ComponentFields
  }
}
    ${BikeFieldsFragmentDoc}
${ComponentFieldsFragmentDoc}`;

/**
 * __useGearQuery__
 *
 * To run a query within a React component, call `useGearQuery` and pass it any options that fit your needs.
 * When your component renders, `useGearQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGearQuery({
 *   variables: {
 *   },
 * });
 */
export function useGearQuery(baseOptions?: Apollo.QueryHookOptions<GearQuery, GearQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GearQuery, GearQueryVariables>(GearDocument, options);
      }
export function useGearLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GearQuery, GearQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GearQuery, GearQueryVariables>(GearDocument, options);
        }
// @ts-ignore
export function useGearSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GearQuery, GearQueryVariables>): Apollo.UseSuspenseQueryResult<GearQuery, GearQueryVariables>;
export function useGearSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GearQuery, GearQueryVariables>): Apollo.UseSuspenseQueryResult<GearQuery | undefined, GearQueryVariables>;
export function useGearSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GearQuery, GearQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GearQuery, GearQueryVariables>(GearDocument, options);
        }
export type GearQueryHookResult = ReturnType<typeof useGearQuery>;
export type GearLazyQueryHookResult = ReturnType<typeof useGearLazyQuery>;
export type GearSuspenseQueryHookResult = ReturnType<typeof useGearSuspenseQuery>;
export type GearQueryResult = Apollo.QueryResult<GearQuery, GearQueryVariables>;
export const AddBikeDocument = gql`
    mutation AddBike($input: AddBikeInput!) {
  addBike(input: $input) {
    ...BikeFields
  }
}
    ${BikeFieldsFragmentDoc}`;
export type AddBikeMutationFn = Apollo.MutationFunction<AddBikeMutation, AddBikeMutationVariables>;

/**
 * __useAddBikeMutation__
 *
 * To run a mutation, you first call `useAddBikeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddBikeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addBikeMutation, { data, loading, error }] = useAddBikeMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddBikeMutation(baseOptions?: Apollo.MutationHookOptions<AddBikeMutation, AddBikeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddBikeMutation, AddBikeMutationVariables>(AddBikeDocument, options);
      }
export type AddBikeMutationHookResult = ReturnType<typeof useAddBikeMutation>;
export type AddBikeMutationResult = Apollo.MutationResult<AddBikeMutation>;
export type AddBikeMutationOptions = Apollo.BaseMutationOptions<AddBikeMutation, AddBikeMutationVariables>;
export const UpdateBikeDocument = gql`
    mutation UpdateBike($id: ID!, $input: UpdateBikeInput!) {
  updateBike(id: $id, input: $input) {
    ...BikeFields
  }
}
    ${BikeFieldsFragmentDoc}`;
export type UpdateBikeMutationFn = Apollo.MutationFunction<UpdateBikeMutation, UpdateBikeMutationVariables>;

/**
 * __useUpdateBikeMutation__
 *
 * To run a mutation, you first call `useUpdateBikeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateBikeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateBikeMutation, { data, loading, error }] = useUpdateBikeMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateBikeMutation(baseOptions?: Apollo.MutationHookOptions<UpdateBikeMutation, UpdateBikeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateBikeMutation, UpdateBikeMutationVariables>(UpdateBikeDocument, options);
      }
export type UpdateBikeMutationHookResult = ReturnType<typeof useUpdateBikeMutation>;
export type UpdateBikeMutationResult = Apollo.MutationResult<UpdateBikeMutation>;
export type UpdateBikeMutationOptions = Apollo.BaseMutationOptions<UpdateBikeMutation, UpdateBikeMutationVariables>;
export const DeleteBikeDocument = gql`
    mutation DeleteBike($id: ID!) {
  deleteBike(id: $id) {
    ok
    id
  }
}
    `;
export type DeleteBikeMutationFn = Apollo.MutationFunction<DeleteBikeMutation, DeleteBikeMutationVariables>;

/**
 * __useDeleteBikeMutation__
 *
 * To run a mutation, you first call `useDeleteBikeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteBikeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteBikeMutation, { data, loading, error }] = useDeleteBikeMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteBikeMutation(baseOptions?: Apollo.MutationHookOptions<DeleteBikeMutation, DeleteBikeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteBikeMutation, DeleteBikeMutationVariables>(DeleteBikeDocument, options);
      }
export type DeleteBikeMutationHookResult = ReturnType<typeof useDeleteBikeMutation>;
export type DeleteBikeMutationResult = Apollo.MutationResult<DeleteBikeMutation>;
export type DeleteBikeMutationOptions = Apollo.BaseMutationOptions<DeleteBikeMutation, DeleteBikeMutationVariables>;
export const RetireBikeDocument = gql`
    mutation RetireBike($id: ID!, $status: BikeStatus!) {
  retireBike(id: $id, status: $status) {
    ...BikeFields
  }
}
    ${BikeFieldsFragmentDoc}`;
export type RetireBikeMutationFn = Apollo.MutationFunction<RetireBikeMutation, RetireBikeMutationVariables>;

/**
 * __useRetireBikeMutation__
 *
 * To run a mutation, you first call `useRetireBikeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRetireBikeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [retireBikeMutation, { data, loading, error }] = useRetireBikeMutation({
 *   variables: {
 *      id: // value for 'id'
 *      status: // value for 'status'
 *   },
 * });
 */
export function useRetireBikeMutation(baseOptions?: Apollo.MutationHookOptions<RetireBikeMutation, RetireBikeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RetireBikeMutation, RetireBikeMutationVariables>(RetireBikeDocument, options);
      }
export type RetireBikeMutationHookResult = ReturnType<typeof useRetireBikeMutation>;
export type RetireBikeMutationResult = Apollo.MutationResult<RetireBikeMutation>;
export type RetireBikeMutationOptions = Apollo.BaseMutationOptions<RetireBikeMutation, RetireBikeMutationVariables>;
export const ReactivateBikeDocument = gql`
    mutation ReactivateBike($id: ID!) {
  reactivateBike(id: $id) {
    ...BikeFields
  }
}
    ${BikeFieldsFragmentDoc}`;
export type ReactivateBikeMutationFn = Apollo.MutationFunction<ReactivateBikeMutation, ReactivateBikeMutationVariables>;

/**
 * __useReactivateBikeMutation__
 *
 * To run a mutation, you first call `useReactivateBikeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReactivateBikeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [reactivateBikeMutation, { data, loading, error }] = useReactivateBikeMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useReactivateBikeMutation(baseOptions?: Apollo.MutationHookOptions<ReactivateBikeMutation, ReactivateBikeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReactivateBikeMutation, ReactivateBikeMutationVariables>(ReactivateBikeDocument, options);
      }
export type ReactivateBikeMutationHookResult = ReturnType<typeof useReactivateBikeMutation>;
export type ReactivateBikeMutationResult = Apollo.MutationResult<ReactivateBikeMutation>;
export type ReactivateBikeMutationOptions = Apollo.BaseMutationOptions<ReactivateBikeMutation, ReactivateBikeMutationVariables>;
export const UpdateComponentDocument = gql`
    mutation UpdateComponent($id: ID!, $input: UpdateComponentInput!) {
  updateComponent(id: $id, input: $input) {
    ...ComponentFields
  }
}
    ${ComponentFieldsFragmentDoc}`;
export type UpdateComponentMutationFn = Apollo.MutationFunction<UpdateComponentMutation, UpdateComponentMutationVariables>;

/**
 * __useUpdateComponentMutation__
 *
 * To run a mutation, you first call `useUpdateComponentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateComponentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateComponentMutation, { data, loading, error }] = useUpdateComponentMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateComponentMutation(baseOptions?: Apollo.MutationHookOptions<UpdateComponentMutation, UpdateComponentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateComponentMutation, UpdateComponentMutationVariables>(UpdateComponentDocument, options);
      }
export type UpdateComponentMutationHookResult = ReturnType<typeof useUpdateComponentMutation>;
export type UpdateComponentMutationResult = Apollo.MutationResult<UpdateComponentMutation>;
export type UpdateComponentMutationOptions = Apollo.BaseMutationOptions<UpdateComponentMutation, UpdateComponentMutationVariables>;
export const LogComponentServiceDocument = gql`
    mutation LogComponentService($id: ID!, $performedAt: String) {
  logComponentService(id: $id, performedAt: $performedAt) {
    ...ComponentFields
  }
}
    ${ComponentFieldsFragmentDoc}`;
export type LogComponentServiceMutationFn = Apollo.MutationFunction<LogComponentServiceMutation, LogComponentServiceMutationVariables>;

/**
 * __useLogComponentServiceMutation__
 *
 * To run a mutation, you first call `useLogComponentServiceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLogComponentServiceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [logComponentServiceMutation, { data, loading, error }] = useLogComponentServiceMutation({
 *   variables: {
 *      id: // value for 'id'
 *      performedAt: // value for 'performedAt'
 *   },
 * });
 */
export function useLogComponentServiceMutation(baseOptions?: Apollo.MutationHookOptions<LogComponentServiceMutation, LogComponentServiceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LogComponentServiceMutation, LogComponentServiceMutationVariables>(LogComponentServiceDocument, options);
      }
export type LogComponentServiceMutationHookResult = ReturnType<typeof useLogComponentServiceMutation>;
export type LogComponentServiceMutationResult = Apollo.MutationResult<LogComponentServiceMutation>;
export type LogComponentServiceMutationOptions = Apollo.BaseMutationOptions<LogComponentServiceMutation, LogComponentServiceMutationVariables>;
export const InstallComponentDocument = gql`
    mutation InstallComponent($input: InstallComponentInput!) {
  installComponent(input: $input) {
    installedComponent {
      ...ComponentFields
    }
    displacedComponent {
      ...ComponentFields
    }
  }
}
    ${ComponentFieldsFragmentDoc}`;
export type InstallComponentMutationFn = Apollo.MutationFunction<InstallComponentMutation, InstallComponentMutationVariables>;

/**
 * __useInstallComponentMutation__
 *
 * To run a mutation, you first call `useInstallComponentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useInstallComponentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [installComponentMutation, { data, loading, error }] = useInstallComponentMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useInstallComponentMutation(baseOptions?: Apollo.MutationHookOptions<InstallComponentMutation, InstallComponentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<InstallComponentMutation, InstallComponentMutationVariables>(InstallComponentDocument, options);
      }
export type InstallComponentMutationHookResult = ReturnType<typeof useInstallComponentMutation>;
export type InstallComponentMutationResult = Apollo.MutationResult<InstallComponentMutation>;
export type InstallComponentMutationOptions = Apollo.BaseMutationOptions<InstallComponentMutation, InstallComponentMutationVariables>;
export const SnoozeComponentDocument = gql`
    mutation SnoozeComponent($id: ID!, $hours: Float) {
  snoozeComponent(id: $id, hours: $hours) {
    id
    serviceDueAtHours
  }
}
    `;
export type SnoozeComponentMutationFn = Apollo.MutationFunction<SnoozeComponentMutation, SnoozeComponentMutationVariables>;

/**
 * __useSnoozeComponentMutation__
 *
 * To run a mutation, you first call `useSnoozeComponentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSnoozeComponentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [snoozeComponentMutation, { data, loading, error }] = useSnoozeComponentMutation({
 *   variables: {
 *      id: // value for 'id'
 *      hours: // value for 'hours'
 *   },
 * });
 */
export function useSnoozeComponentMutation(baseOptions?: Apollo.MutationHookOptions<SnoozeComponentMutation, SnoozeComponentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SnoozeComponentMutation, SnoozeComponentMutationVariables>(SnoozeComponentDocument, options);
      }
export type SnoozeComponentMutationHookResult = ReturnType<typeof useSnoozeComponentMutation>;
export type SnoozeComponentMutationResult = Apollo.MutationResult<SnoozeComponentMutation>;
export type SnoozeComponentMutationOptions = Apollo.BaseMutationOptions<SnoozeComponentMutation, SnoozeComponentMutationVariables>;
export const UpdateBikeNotificationPreferenceDocument = gql`
    mutation UpdateBikeNotificationPreference($input: UpdateBikeNotificationPreferenceInput!) {
  updateBikeNotificationPreference(input: $input) {
    ...BikeNotificationPreferenceFields
  }
}
    ${BikeNotificationPreferenceFieldsFragmentDoc}`;
export type UpdateBikeNotificationPreferenceMutationFn = Apollo.MutationFunction<UpdateBikeNotificationPreferenceMutation, UpdateBikeNotificationPreferenceMutationVariables>;

/**
 * __useUpdateBikeNotificationPreferenceMutation__
 *
 * To run a mutation, you first call `useUpdateBikeNotificationPreferenceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateBikeNotificationPreferenceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateBikeNotificationPreferenceMutation, { data, loading, error }] = useUpdateBikeNotificationPreferenceMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateBikeNotificationPreferenceMutation(baseOptions?: Apollo.MutationHookOptions<UpdateBikeNotificationPreferenceMutation, UpdateBikeNotificationPreferenceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateBikeNotificationPreferenceMutation, UpdateBikeNotificationPreferenceMutationVariables>(UpdateBikeNotificationPreferenceDocument, options);
      }
export type UpdateBikeNotificationPreferenceMutationHookResult = ReturnType<typeof useUpdateBikeNotificationPreferenceMutation>;
export type UpdateBikeNotificationPreferenceMutationResult = Apollo.MutationResult<UpdateBikeNotificationPreferenceMutation>;
export type UpdateBikeNotificationPreferenceMutationOptions = Apollo.BaseMutationOptions<UpdateBikeNotificationPreferenceMutation, UpdateBikeNotificationPreferenceMutationVariables>;
export const MeDocument = gql`
    query Me {
  me {
    id
    email
    name
    avatarUrl
    onboardingCompleted
    hasAcceptedCurrentTerms
    location
    age
    role
    mustChangePassword
    isFoundingRider
    hoursDisplayPreference
    predictionMode
    distanceUnit
    notifyOnRideUpload
    pairedComponentMigrationSeenAt
    createdAt
    activeDataSource
    subscriptionTier
    subscriptionProvider
    referralCode
    needsDowngradeSelection
    tierLimits {
      maxBikes
      allowedComponentTypes
      currentBikeCount
      canAddBike
    }
    accounts {
      provider
      connectedAt
    }
  }
}
    `;

/**
 * __useMeQuery__
 *
 * To run a query within a React component, call `useMeQuery` and pass it any options that fit your needs.
 * When your component renders, `useMeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMeQuery({
 *   variables: {
 *   },
 * });
 */
export function useMeQuery(baseOptions?: Apollo.QueryHookOptions<MeQuery, MeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MeQuery, MeQueryVariables>(MeDocument, options);
      }
export function useMeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
// @ts-ignore
export function useMeSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MeQuery, MeQueryVariables>): Apollo.UseSuspenseQueryResult<MeQuery, MeQueryVariables>;
export function useMeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MeQuery, MeQueryVariables>): Apollo.UseSuspenseQueryResult<MeQuery | undefined, MeQueryVariables>;
export function useMeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeSuspenseQueryHookResult = ReturnType<typeof useMeSuspenseQuery>;
export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>;
export const ReferralStatsDocument = gql`
    query ReferralStats {
  referralStats {
    referralCode
    referralLink
    pendingCount
    completedCount
  }
}
    `;

/**
 * __useReferralStatsQuery__
 *
 * To run a query within a React component, call `useReferralStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useReferralStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReferralStatsQuery({
 *   variables: {
 *   },
 * });
 */
export function useReferralStatsQuery(baseOptions?: Apollo.QueryHookOptions<ReferralStatsQuery, ReferralStatsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReferralStatsQuery, ReferralStatsQueryVariables>(ReferralStatsDocument, options);
      }
export function useReferralStatsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReferralStatsQuery, ReferralStatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReferralStatsQuery, ReferralStatsQueryVariables>(ReferralStatsDocument, options);
        }
// @ts-ignore
export function useReferralStatsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ReferralStatsQuery, ReferralStatsQueryVariables>): Apollo.UseSuspenseQueryResult<ReferralStatsQuery, ReferralStatsQueryVariables>;
export function useReferralStatsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ReferralStatsQuery, ReferralStatsQueryVariables>): Apollo.UseSuspenseQueryResult<ReferralStatsQuery | undefined, ReferralStatsQueryVariables>;
export function useReferralStatsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ReferralStatsQuery, ReferralStatsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ReferralStatsQuery, ReferralStatsQueryVariables>(ReferralStatsDocument, options);
        }
export type ReferralStatsQueryHookResult = ReturnType<typeof useReferralStatsQuery>;
export type ReferralStatsLazyQueryHookResult = ReturnType<typeof useReferralStatsLazyQuery>;
export type ReferralStatsSuspenseQueryHookResult = ReturnType<typeof useReferralStatsSuspenseQuery>;
export type ReferralStatsQueryResult = Apollo.QueryResult<ReferralStatsQuery, ReferralStatsQueryVariables>;
export const RecentRidesDocument = gql`
    query RecentRides($take: Int) {
  rides(take: $take) {
    id
    startTime
    durationSeconds
    distanceMeters
    elevationGainMeters
    rideType
    bikeId
    location
    weather {
      id
      tempC
      condition
    }
  }
}
    `;

/**
 * __useRecentRidesQuery__
 *
 * To run a query within a React component, call `useRecentRidesQuery` and pass it any options that fit your needs.
 * When your component renders, `useRecentRidesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRecentRidesQuery({
 *   variables: {
 *      take: // value for 'take'
 *   },
 * });
 */
export function useRecentRidesQuery(baseOptions?: Apollo.QueryHookOptions<RecentRidesQuery, RecentRidesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RecentRidesQuery, RecentRidesQueryVariables>(RecentRidesDocument, options);
      }
export function useRecentRidesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RecentRidesQuery, RecentRidesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RecentRidesQuery, RecentRidesQueryVariables>(RecentRidesDocument, options);
        }
// @ts-ignore
export function useRecentRidesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<RecentRidesQuery, RecentRidesQueryVariables>): Apollo.UseSuspenseQueryResult<RecentRidesQuery, RecentRidesQueryVariables>;
export function useRecentRidesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<RecentRidesQuery, RecentRidesQueryVariables>): Apollo.UseSuspenseQueryResult<RecentRidesQuery | undefined, RecentRidesQueryVariables>;
export function useRecentRidesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<RecentRidesQuery, RecentRidesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<RecentRidesQuery, RecentRidesQueryVariables>(RecentRidesDocument, options);
        }
export type RecentRidesQueryHookResult = ReturnType<typeof useRecentRidesQuery>;
export type RecentRidesLazyQueryHookResult = ReturnType<typeof useRecentRidesLazyQuery>;
export type RecentRidesSuspenseQueryHookResult = ReturnType<typeof useRecentRidesSuspenseQuery>;
export type RecentRidesQueryResult = Apollo.QueryResult<RecentRidesQuery, RecentRidesQueryVariables>;
export const RidesPageDocument = gql`
    query RidesPage($take: Int, $after: ID, $filter: RidesFilterInput) {
  rides(take: $take, after: $after, filter: $filter) {
    id
    startTime
    durationSeconds
    distanceMeters
    elevationGainMeters
    averageHr
    rideType
    bikeId
    location
    notes
    garminActivityId
    stravaActivityId
    whoopWorkoutId
    suuntoWorkoutId
    weather {
      id
      tempC
      feelsLikeC
      precipitationMm
      windSpeedKph
      humidity
      wmoCode
      condition
    }
  }
}
    `;

/**
 * __useRidesPageQuery__
 *
 * To run a query within a React component, call `useRidesPageQuery` and pass it any options that fit your needs.
 * When your component renders, `useRidesPageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRidesPageQuery({
 *   variables: {
 *      take: // value for 'take'
 *      after: // value for 'after'
 *      filter: // value for 'filter'
 *   },
 * });
 */
export function useRidesPageQuery(baseOptions?: Apollo.QueryHookOptions<RidesPageQuery, RidesPageQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RidesPageQuery, RidesPageQueryVariables>(RidesPageDocument, options);
      }
export function useRidesPageLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RidesPageQuery, RidesPageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RidesPageQuery, RidesPageQueryVariables>(RidesPageDocument, options);
        }
// @ts-ignore
export function useRidesPageSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<RidesPageQuery, RidesPageQueryVariables>): Apollo.UseSuspenseQueryResult<RidesPageQuery, RidesPageQueryVariables>;
export function useRidesPageSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<RidesPageQuery, RidesPageQueryVariables>): Apollo.UseSuspenseQueryResult<RidesPageQuery | undefined, RidesPageQueryVariables>;
export function useRidesPageSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<RidesPageQuery, RidesPageQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<RidesPageQuery, RidesPageQueryVariables>(RidesPageDocument, options);
        }
export type RidesPageQueryHookResult = ReturnType<typeof useRidesPageQuery>;
export type RidesPageLazyQueryHookResult = ReturnType<typeof useRidesPageLazyQuery>;
export type RidesPageSuspenseQueryHookResult = ReturnType<typeof useRidesPageSuspenseQuery>;
export type RidesPageQueryResult = Apollo.QueryResult<RidesPageQuery, RidesPageQueryVariables>;
export const UpdateServiceLogDocument = gql`
    mutation UpdateServiceLog($id: ID!, $input: UpdateServiceLogInput!) {
  updateServiceLog(id: $id, input: $input) {
    id
    performedAt
    notes
    hoursAtService
  }
}
    `;
export type UpdateServiceLogMutationFn = Apollo.MutationFunction<UpdateServiceLogMutation, UpdateServiceLogMutationVariables>;

/**
 * __useUpdateServiceLogMutation__
 *
 * To run a mutation, you first call `useUpdateServiceLogMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateServiceLogMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateServiceLogMutation, { data, loading, error }] = useUpdateServiceLogMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateServiceLogMutation(baseOptions?: Apollo.MutationHookOptions<UpdateServiceLogMutation, UpdateServiceLogMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateServiceLogMutation, UpdateServiceLogMutationVariables>(UpdateServiceLogDocument, options);
      }
export type UpdateServiceLogMutationHookResult = ReturnType<typeof useUpdateServiceLogMutation>;
export type UpdateServiceLogMutationResult = Apollo.MutationResult<UpdateServiceLogMutation>;
export type UpdateServiceLogMutationOptions = Apollo.BaseMutationOptions<UpdateServiceLogMutation, UpdateServiceLogMutationVariables>;
export const DeleteServiceLogDocument = gql`
    mutation DeleteServiceLog($id: ID!) {
  deleteServiceLog(id: $id)
}
    `;
export type DeleteServiceLogMutationFn = Apollo.MutationFunction<DeleteServiceLogMutation, DeleteServiceLogMutationVariables>;

/**
 * __useDeleteServiceLogMutation__
 *
 * To run a mutation, you first call `useDeleteServiceLogMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteServiceLogMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteServiceLogMutation, { data, loading, error }] = useDeleteServiceLogMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteServiceLogMutation(baseOptions?: Apollo.MutationHookOptions<DeleteServiceLogMutation, DeleteServiceLogMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteServiceLogMutation, DeleteServiceLogMutationVariables>(DeleteServiceLogDocument, options);
      }
export type DeleteServiceLogMutationHookResult = ReturnType<typeof useDeleteServiceLogMutation>;
export type DeleteServiceLogMutationResult = Apollo.MutationResult<DeleteServiceLogMutation>;
export type DeleteServiceLogMutationOptions = Apollo.BaseMutationOptions<DeleteServiceLogMutation, DeleteServiceLogMutationVariables>;
export const UnmappedStravaGearsDocument = gql`
    query UnmappedStravaGears {
  unmappedStravaGears {
    gearId
    gearName
    rideCount
    isMapped
  }
}
    `;

/**
 * __useUnmappedStravaGearsQuery__
 *
 * To run a query within a React component, call `useUnmappedStravaGearsQuery` and pass it any options that fit your needs.
 * When your component renders, `useUnmappedStravaGearsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUnmappedStravaGearsQuery({
 *   variables: {
 *   },
 * });
 */
export function useUnmappedStravaGearsQuery(baseOptions?: Apollo.QueryHookOptions<UnmappedStravaGearsQuery, UnmappedStravaGearsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UnmappedStravaGearsQuery, UnmappedStravaGearsQueryVariables>(UnmappedStravaGearsDocument, options);
      }
export function useUnmappedStravaGearsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UnmappedStravaGearsQuery, UnmappedStravaGearsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UnmappedStravaGearsQuery, UnmappedStravaGearsQueryVariables>(UnmappedStravaGearsDocument, options);
        }
// @ts-ignore
export function useUnmappedStravaGearsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<UnmappedStravaGearsQuery, UnmappedStravaGearsQueryVariables>): Apollo.UseSuspenseQueryResult<UnmappedStravaGearsQuery, UnmappedStravaGearsQueryVariables>;
export function useUnmappedStravaGearsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<UnmappedStravaGearsQuery, UnmappedStravaGearsQueryVariables>): Apollo.UseSuspenseQueryResult<UnmappedStravaGearsQuery | undefined, UnmappedStravaGearsQueryVariables>;
export function useUnmappedStravaGearsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<UnmappedStravaGearsQuery, UnmappedStravaGearsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<UnmappedStravaGearsQuery, UnmappedStravaGearsQueryVariables>(UnmappedStravaGearsDocument, options);
        }
export type UnmappedStravaGearsQueryHookResult = ReturnType<typeof useUnmappedStravaGearsQuery>;
export type UnmappedStravaGearsLazyQueryHookResult = ReturnType<typeof useUnmappedStravaGearsLazyQuery>;
export type UnmappedStravaGearsSuspenseQueryHookResult = ReturnType<typeof useUnmappedStravaGearsSuspenseQuery>;
export type UnmappedStravaGearsQueryResult = Apollo.QueryResult<UnmappedStravaGearsQuery, UnmappedStravaGearsQueryVariables>;
export const StravaGearMappingsDocument = gql`
    query StravaGearMappings {
  stravaGearMappings {
    id
    stravaGearId
    stravaGearName
    bikeId
    bike {
      id
      nickname
      manufacturer
      model
    }
    createdAt
  }
}
    `;

/**
 * __useStravaGearMappingsQuery__
 *
 * To run a query within a React component, call `useStravaGearMappingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useStravaGearMappingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStravaGearMappingsQuery({
 *   variables: {
 *   },
 * });
 */
export function useStravaGearMappingsQuery(baseOptions?: Apollo.QueryHookOptions<StravaGearMappingsQuery, StravaGearMappingsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<StravaGearMappingsQuery, StravaGearMappingsQueryVariables>(StravaGearMappingsDocument, options);
      }
export function useStravaGearMappingsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<StravaGearMappingsQuery, StravaGearMappingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<StravaGearMappingsQuery, StravaGearMappingsQueryVariables>(StravaGearMappingsDocument, options);
        }
// @ts-ignore
export function useStravaGearMappingsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<StravaGearMappingsQuery, StravaGearMappingsQueryVariables>): Apollo.UseSuspenseQueryResult<StravaGearMappingsQuery, StravaGearMappingsQueryVariables>;
export function useStravaGearMappingsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<StravaGearMappingsQuery, StravaGearMappingsQueryVariables>): Apollo.UseSuspenseQueryResult<StravaGearMappingsQuery | undefined, StravaGearMappingsQueryVariables>;
export function useStravaGearMappingsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<StravaGearMappingsQuery, StravaGearMappingsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<StravaGearMappingsQuery, StravaGearMappingsQueryVariables>(StravaGearMappingsDocument, options);
        }
export type StravaGearMappingsQueryHookResult = ReturnType<typeof useStravaGearMappingsQuery>;
export type StravaGearMappingsLazyQueryHookResult = ReturnType<typeof useStravaGearMappingsLazyQuery>;
export type StravaGearMappingsSuspenseQueryHookResult = ReturnType<typeof useStravaGearMappingsSuspenseQuery>;
export type StravaGearMappingsQueryResult = Apollo.QueryResult<StravaGearMappingsQuery, StravaGearMappingsQueryVariables>;
export const CreateStravaGearMappingDocument = gql`
    mutation CreateStravaGearMapping($input: CreateStravaGearMappingInput!) {
  createStravaGearMapping(input: $input) {
    id
    stravaGearId
    stravaGearName
    bikeId
  }
}
    `;
export type CreateStravaGearMappingMutationFn = Apollo.MutationFunction<CreateStravaGearMappingMutation, CreateStravaGearMappingMutationVariables>;

/**
 * __useCreateStravaGearMappingMutation__
 *
 * To run a mutation, you first call `useCreateStravaGearMappingMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateStravaGearMappingMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createStravaGearMappingMutation, { data, loading, error }] = useCreateStravaGearMappingMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateStravaGearMappingMutation(baseOptions?: Apollo.MutationHookOptions<CreateStravaGearMappingMutation, CreateStravaGearMappingMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateStravaGearMappingMutation, CreateStravaGearMappingMutationVariables>(CreateStravaGearMappingDocument, options);
      }
export type CreateStravaGearMappingMutationHookResult = ReturnType<typeof useCreateStravaGearMappingMutation>;
export type CreateStravaGearMappingMutationResult = Apollo.MutationResult<CreateStravaGearMappingMutation>;
export type CreateStravaGearMappingMutationOptions = Apollo.BaseMutationOptions<CreateStravaGearMappingMutation, CreateStravaGearMappingMutationVariables>;
export const DeleteStravaGearMappingDocument = gql`
    mutation DeleteStravaGearMapping($id: ID!) {
  deleteStravaGearMapping(id: $id) {
    ok
    id
  }
}
    `;
export type DeleteStravaGearMappingMutationFn = Apollo.MutationFunction<DeleteStravaGearMappingMutation, DeleteStravaGearMappingMutationVariables>;

/**
 * __useDeleteStravaGearMappingMutation__
 *
 * To run a mutation, you first call `useDeleteStravaGearMappingMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteStravaGearMappingMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteStravaGearMappingMutation, { data, loading, error }] = useDeleteStravaGearMappingMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteStravaGearMappingMutation(baseOptions?: Apollo.MutationHookOptions<DeleteStravaGearMappingMutation, DeleteStravaGearMappingMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteStravaGearMappingMutation, DeleteStravaGearMappingMutationVariables>(DeleteStravaGearMappingDocument, options);
      }
export type DeleteStravaGearMappingMutationHookResult = ReturnType<typeof useDeleteStravaGearMappingMutation>;
export type DeleteStravaGearMappingMutationResult = Apollo.MutationResult<DeleteStravaGearMappingMutation>;
export type DeleteStravaGearMappingMutationOptions = Apollo.BaseMutationOptions<DeleteStravaGearMappingMutation, DeleteStravaGearMappingMutationVariables>;
export const UpdateRideDocument = gql`
    mutation UpdateRide($id: ID!, $input: UpdateRideInput!) {
  updateRide(id: $id, input: $input) {
    id
    startTime
    durationSeconds
    distanceMeters
    elevationGainMeters
    rideType
    bikeId
    location
    notes
  }
}
    `;
export type UpdateRideMutationFn = Apollo.MutationFunction<UpdateRideMutation, UpdateRideMutationVariables>;

/**
 * __useUpdateRideMutation__
 *
 * To run a mutation, you first call `useUpdateRideMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateRideMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateRideMutation, { data, loading, error }] = useUpdateRideMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateRideMutation(baseOptions?: Apollo.MutationHookOptions<UpdateRideMutation, UpdateRideMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateRideMutation, UpdateRideMutationVariables>(UpdateRideDocument, options);
      }
export type UpdateRideMutationHookResult = ReturnType<typeof useUpdateRideMutation>;
export type UpdateRideMutationResult = Apollo.MutationResult<UpdateRideMutation>;
export type UpdateRideMutationOptions = Apollo.BaseMutationOptions<UpdateRideMutation, UpdateRideMutationVariables>;
export const UpdateUserPreferencesDocument = gql`
    mutation UpdateUserPreferences($input: UpdateUserPreferencesInput!) {
  updateUserPreferences(input: $input) {
    id
    hoursDisplayPreference
    predictionMode
    distanceUnit
    notifyOnRideUpload
  }
}
    `;
export type UpdateUserPreferencesMutationFn = Apollo.MutationFunction<UpdateUserPreferencesMutation, UpdateUserPreferencesMutationVariables>;

/**
 * __useUpdateUserPreferencesMutation__
 *
 * To run a mutation, you first call `useUpdateUserPreferencesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserPreferencesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUserPreferencesMutation, { data, loading, error }] = useUpdateUserPreferencesMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateUserPreferencesMutation(baseOptions?: Apollo.MutationHookOptions<UpdateUserPreferencesMutation, UpdateUserPreferencesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateUserPreferencesMutation, UpdateUserPreferencesMutationVariables>(UpdateUserPreferencesDocument, options);
      }
export type UpdateUserPreferencesMutationHookResult = ReturnType<typeof useUpdateUserPreferencesMutation>;
export type UpdateUserPreferencesMutationResult = Apollo.MutationResult<UpdateUserPreferencesMutation>;
export type UpdateUserPreferencesMutationOptions = Apollo.BaseMutationOptions<UpdateUserPreferencesMutation, UpdateUserPreferencesMutationVariables>;
export const WeatherBreakdownDocument = gql`
    query WeatherBreakdown($filter: RidesFilterInput) {
  me {
    id
    weatherBreakdown(filter: $filter) {
      sunny
      cloudy
      rainy
      snowy
      windy
      foggy
      unknown
      pending
      totalRides
    }
  }
}
    `;

/**
 * __useWeatherBreakdownQuery__
 *
 * To run a query within a React component, call `useWeatherBreakdownQuery` and pass it any options that fit your needs.
 * When your component renders, `useWeatherBreakdownQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWeatherBreakdownQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *   },
 * });
 */
export function useWeatherBreakdownQuery(baseOptions?: Apollo.QueryHookOptions<WeatherBreakdownQuery, WeatherBreakdownQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<WeatherBreakdownQuery, WeatherBreakdownQueryVariables>(WeatherBreakdownDocument, options);
      }
export function useWeatherBreakdownLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<WeatherBreakdownQuery, WeatherBreakdownQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<WeatherBreakdownQuery, WeatherBreakdownQueryVariables>(WeatherBreakdownDocument, options);
        }
// @ts-ignore
export function useWeatherBreakdownSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<WeatherBreakdownQuery, WeatherBreakdownQueryVariables>): Apollo.UseSuspenseQueryResult<WeatherBreakdownQuery, WeatherBreakdownQueryVariables>;
export function useWeatherBreakdownSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<WeatherBreakdownQuery, WeatherBreakdownQueryVariables>): Apollo.UseSuspenseQueryResult<WeatherBreakdownQuery | undefined, WeatherBreakdownQueryVariables>;
export function useWeatherBreakdownSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<WeatherBreakdownQuery, WeatherBreakdownQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<WeatherBreakdownQuery, WeatherBreakdownQueryVariables>(WeatherBreakdownDocument, options);
        }
export type WeatherBreakdownQueryHookResult = ReturnType<typeof useWeatherBreakdownQuery>;
export type WeatherBreakdownLazyQueryHookResult = ReturnType<typeof useWeatherBreakdownLazyQuery>;
export type WeatherBreakdownSuspenseQueryHookResult = ReturnType<typeof useWeatherBreakdownSuspenseQuery>;
export type WeatherBreakdownQueryResult = Apollo.QueryResult<WeatherBreakdownQuery, WeatherBreakdownQueryVariables>;