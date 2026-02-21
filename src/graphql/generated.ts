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
  distanceMiles: Scalars['Float']['input'];
  durationSeconds: Scalars['Int']['input'];
  elevationGainFeet: Scalars['Float']['input'];
  location?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  rideType: Scalars['String']['input'];
  startTime: Scalars['String']['input'];
  trailSystem?: InputMaybe<Scalars['String']['input']>;
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
  pivotBearings?: Maybe<Component>;
  predictions?: Maybe<BikePredictionSummary>;
  seatpost?: Maybe<Component>;
  servicePreferences: Array<BikeServicePreference>;
  shock?: Maybe<Component>;
  sortOrder: Scalars['Int']['output'];
  spokesId?: Maybe<Scalars['String']['output']>;
  spokesUrl?: Maybe<Scalars['String']['output']>;
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

export type CalibrationState = {
  __typename?: 'CalibrationState';
  bikes: Array<BikeCalibrationInfo>;
  overdueCount: Scalars['Int']['output'];
  showOverlay: Scalars['Boolean']['output'];
  totalComponentCount: Scalars['Int']['output'];
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
  bulkUpdateComponentBaselines: Array<Component>;
  completeCalibration: User;
  createStravaGearMapping: StravaGearMapping;
  deleteBike: DeleteResult;
  deleteBikeNote: DeleteResult;
  deleteComponent: DeleteResult;
  deleteRide: DeleteRideResult;
  deleteStravaGearMapping: DeleteResult;
  dismissCalibration: User;
  installComponent: InstallComponentResult;
  logBulkComponentService: BulkServiceResult;
  logComponentService: Component;
  logService: ServiceLog;
  markPairedComponentMigrationSeen: User;
  migratePairedComponents: MigratePairedComponentsResult;
  replaceComponent: ReplaceComponentResult;
  resetCalibration: User;
  snoozeComponent: Component;
  swapComponents: SwapComponentsResult;
  triggerProviderSync: TriggerSyncResult;
  updateBike: Bike;
  updateBikeServicePreferences: Array<BikeServicePreference>;
  updateBikesOrder: Array<Bike>;
  updateComponent: Component;
  updateRide: Ride;
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


export type MutationBulkUpdateComponentBaselinesArgs = {
  input: BulkUpdateBaselinesInput;
};


export type MutationCreateStravaGearMappingArgs = {
  input: CreateStravaGearMappingInput;
};


export type MutationDeleteBikeArgs = {
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


export type MutationReplaceComponentArgs = {
  input: ReplaceComponentInput;
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


export type MutationUpdateBikeArgs = {
  id: Scalars['ID']['input'];
  input: UpdateBikeInput;
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
  bikeNotes: BikeNotesPage;
  bikes: Array<Bike>;
  calibrationState?: Maybe<CalibrationState>;
  components: Array<Component>;
  importNotificationState?: Maybe<ImportNotificationState>;
  me?: Maybe<User>;
  rideTypes: Array<RideType>;
  rides: Array<Ride>;
  servicePreferenceDefaults: Array<ServicePreferenceDefault>;
  stravaGearMappings: Array<StravaGearMapping>;
  unassignedRides: UnassignedRidesPage;
  unmappedStravaGears: Array<StravaGearInfo>;
  user?: Maybe<User>;
};


export type QueryBikeNotesArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  bikeId: Scalars['ID']['input'];
  take?: InputMaybe<Scalars['Int']['input']>;
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

export type ReplaceComponentInput = {
  alsoReplacePair?: InputMaybe<Scalars['Boolean']['input']>;
  componentId: Scalars['ID']['input'];
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
  distanceMiles: Scalars['Float']['output'];
  durationSeconds: Scalars['Int']['output'];
  elevationGainFeet: Scalars['Float']['output'];
  garminActivityId?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  location?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  rideType: Scalars['String']['output'];
  startTime: Scalars['String']['output'];
  stravaActivityId?: Maybe<Scalars['String']['output']>;
  stravaGearId?: Maybe<Scalars['String']['output']>;
  trailSystem?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
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

export type RidesFilterInput = {
  bikeId?: InputMaybe<Scalars['ID']['input']>;
  endDate?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
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

export type SwapComponentsInput = {
  bikeIdA: Scalars['ID']['input'];
  bikeIdB: Scalars['ID']['input'];
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
  distanceMiles: Scalars['Float']['output'];
  durationSeconds: Scalars['Int']['output'];
  elevationGainFeet: Scalars['Float']['output'];
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

export type UpdateBikeInput = {
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
  distanceMiles?: InputMaybe<Scalars['Float']['input']>;
  durationSeconds?: InputMaybe<Scalars['Int']['input']>;
  elevationGainFeet?: InputMaybe<Scalars['Float']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  rideType?: InputMaybe<Scalars['String']['input']>;
  startTime?: InputMaybe<Scalars['String']['input']>;
  trailSystem?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateServicePreferencesInput = {
  preferences: Array<ServicePreferenceInput>;
};

export type UpdateUserPreferencesInput = {
  hoursDisplayPreference?: InputMaybe<Scalars['String']['input']>;
  predictionMode?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  accounts: Array<ConnectedAccount>;
  activeDataSource?: Maybe<Scalars['String']['output']>;
  age?: Maybe<Scalars['Int']['output']>;
  avatarUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  email: Scalars['String']['output'];
  hasAcceptedCurrentTerms: Scalars['Boolean']['output'];
  hasPassword: Scalars['Boolean']['output'];
  hoursDisplayPreference?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isFoundingRider: Scalars['Boolean']['output'];
  location?: Maybe<Scalars['String']['output']>;
  mustChangePassword: Scalars['Boolean']['output'];
  name?: Maybe<Scalars['String']['output']>;
  needsReauthForSensitiveActions: Scalars['Boolean']['output'];
  onboardingCompleted: Scalars['Boolean']['output'];
  pairedComponentMigrationSeenAt?: Maybe<Scalars['String']['output']>;
  predictionMode?: Maybe<Scalars['String']['output']>;
  rides: Array<Ride>;
  role: UserRole;
  servicePreferences: Array<UserServicePreference>;
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

export type AcceptTermsMutationVariables = Exact<{
  input: AcceptTermsInput;
}>;


export type AcceptTermsMutation = { __typename?: 'Mutation', acceptTerms: { __typename?: 'AcceptTermsResult', success: boolean, acceptedAt: string } };

export type ComponentFieldsFragment = { __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus };

export type PredictionFieldsFragment = { __typename?: 'BikePredictionSummary', bikeId: string, bikeName: string, overallStatus: PredictionStatus, dueNowCount: number, dueSoonCount: number, generatedAt: string, priorityComponent?: { __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number } | null, components: Array<{ __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number }> };

export type BikeFieldsLightFragment = { __typename?: 'Bike', id: string, nickname?: string | null, manufacturer: string, model: string, year?: number | null, travelForkMm?: number | null, travelShockMm?: number | null, notes?: string | null, spokesId?: string | null, spokesUrl?: string | null, thumbnailUrl?: string | null, family?: string | null, category?: string | null, subcategory?: string | null, buildKind?: string | null, isFrameset?: boolean | null, isEbike?: boolean | null, gender?: string | null, frameMaterial?: string | null, hangerStandard?: string | null, motorMaker?: string | null, motorModel?: string | null, motorPowerW?: number | null, motorTorqueNm?: number | null, batteryWh?: number | null, acquisitionCondition?: AcquisitionCondition | null, createdAt: string, updatedAt: string, components: Array<{ __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus }> };

export type BikeFieldsFragment = { __typename?: 'Bike', id: string, nickname?: string | null, manufacturer: string, model: string, year?: number | null, travelForkMm?: number | null, travelShockMm?: number | null, notes?: string | null, spokesId?: string | null, spokesUrl?: string | null, thumbnailUrl?: string | null, family?: string | null, category?: string | null, subcategory?: string | null, buildKind?: string | null, isFrameset?: boolean | null, isEbike?: boolean | null, gender?: string | null, frameMaterial?: string | null, hangerStandard?: string | null, motorMaker?: string | null, motorModel?: string | null, motorPowerW?: number | null, motorTorqueNm?: number | null, batteryWh?: number | null, acquisitionCondition?: AcquisitionCondition | null, createdAt: string, updatedAt: string, components: Array<{ __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus }>, predictions?: { __typename?: 'BikePredictionSummary', bikeId: string, bikeName: string, overallStatus: PredictionStatus, dueNowCount: number, dueSoonCount: number, generatedAt: string, priorityComponent?: { __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number } | null, components: Array<{ __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number }> } | null };

export type GearLightQueryVariables = Exact<{ [key: string]: never; }>;


export type GearLightQuery = { __typename?: 'Query', bikes: Array<{ __typename?: 'Bike', id: string, nickname?: string | null, manufacturer: string, model: string, year?: number | null, travelForkMm?: number | null, travelShockMm?: number | null, notes?: string | null, spokesId?: string | null, spokesUrl?: string | null, thumbnailUrl?: string | null, family?: string | null, category?: string | null, subcategory?: string | null, buildKind?: string | null, isFrameset?: boolean | null, isEbike?: boolean | null, gender?: string | null, frameMaterial?: string | null, hangerStandard?: string | null, motorMaker?: string | null, motorModel?: string | null, motorPowerW?: number | null, motorTorqueNm?: number | null, batteryWh?: number | null, acquisitionCondition?: AcquisitionCondition | null, createdAt: string, updatedAt: string, components: Array<{ __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus }> }>, spareComponents: Array<{ __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus }> };

export type GearQueryVariables = Exact<{ [key: string]: never; }>;


export type GearQuery = { __typename?: 'Query', bikes: Array<{ __typename?: 'Bike', id: string, nickname?: string | null, manufacturer: string, model: string, year?: number | null, travelForkMm?: number | null, travelShockMm?: number | null, notes?: string | null, spokesId?: string | null, spokesUrl?: string | null, thumbnailUrl?: string | null, family?: string | null, category?: string | null, subcategory?: string | null, buildKind?: string | null, isFrameset?: boolean | null, isEbike?: boolean | null, gender?: string | null, frameMaterial?: string | null, hangerStandard?: string | null, motorMaker?: string | null, motorModel?: string | null, motorPowerW?: number | null, motorTorqueNm?: number | null, batteryWh?: number | null, acquisitionCondition?: AcquisitionCondition | null, createdAt: string, updatedAt: string, components: Array<{ __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus }>, predictions?: { __typename?: 'BikePredictionSummary', bikeId: string, bikeName: string, overallStatus: PredictionStatus, dueNowCount: number, dueSoonCount: number, generatedAt: string, priorityComponent?: { __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number } | null, components: Array<{ __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number }> } | null }>, spareComponents: Array<{ __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus }> };

export type AddBikeMutationVariables = Exact<{
  input: AddBikeInput;
}>;


export type AddBikeMutation = { __typename?: 'Mutation', addBike: { __typename?: 'Bike', id: string, nickname?: string | null, manufacturer: string, model: string, year?: number | null, travelForkMm?: number | null, travelShockMm?: number | null, notes?: string | null, spokesId?: string | null, spokesUrl?: string | null, thumbnailUrl?: string | null, family?: string | null, category?: string | null, subcategory?: string | null, buildKind?: string | null, isFrameset?: boolean | null, isEbike?: boolean | null, gender?: string | null, frameMaterial?: string | null, hangerStandard?: string | null, motorMaker?: string | null, motorModel?: string | null, motorPowerW?: number | null, motorTorqueNm?: number | null, batteryWh?: number | null, acquisitionCondition?: AcquisitionCondition | null, createdAt: string, updatedAt: string, components: Array<{ __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus }>, predictions?: { __typename?: 'BikePredictionSummary', bikeId: string, bikeName: string, overallStatus: PredictionStatus, dueNowCount: number, dueSoonCount: number, generatedAt: string, priorityComponent?: { __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number } | null, components: Array<{ __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number }> } | null } };

export type UpdateBikeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateBikeInput;
}>;


export type UpdateBikeMutation = { __typename?: 'Mutation', updateBike: { __typename?: 'Bike', id: string, nickname?: string | null, manufacturer: string, model: string, year?: number | null, travelForkMm?: number | null, travelShockMm?: number | null, notes?: string | null, spokesId?: string | null, spokesUrl?: string | null, thumbnailUrl?: string | null, family?: string | null, category?: string | null, subcategory?: string | null, buildKind?: string | null, isFrameset?: boolean | null, isEbike?: boolean | null, gender?: string | null, frameMaterial?: string | null, hangerStandard?: string | null, motorMaker?: string | null, motorModel?: string | null, motorPowerW?: number | null, motorTorqueNm?: number | null, batteryWh?: number | null, acquisitionCondition?: AcquisitionCondition | null, createdAt: string, updatedAt: string, components: Array<{ __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus }>, predictions?: { __typename?: 'BikePredictionSummary', bikeId: string, bikeName: string, overallStatus: PredictionStatus, dueNowCount: number, dueSoonCount: number, generatedAt: string, priorityComponent?: { __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number } | null, components: Array<{ __typename?: 'ComponentPrediction', componentId: string, componentType: ComponentType, location: ComponentLocation, brand: string, model: string, status: PredictionStatus, hoursRemaining: number, ridesRemainingEstimate: number, confidence: ConfidenceLevel, currentHours: number, serviceIntervalHours: number, hoursSinceService: number }> } | null } };

export type DeleteBikeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteBikeMutation = { __typename?: 'Mutation', deleteBike: { __typename?: 'DeleteResult', ok: boolean, id: string } };

export type UpdateComponentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateComponentInput;
}>;


export type UpdateComponentMutation = { __typename?: 'Mutation', updateComponent: { __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus } };

export type LogComponentServiceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  performedAt?: InputMaybe<Scalars['String']['input']>;
}>;


export type LogComponentServiceMutation = { __typename?: 'Mutation', logComponentService: { __typename?: 'Component', id: string, type: ComponentType, brand: string, model: string, notes?: string | null, isStock: boolean, bikeId?: string | null, hoursUsed: number, serviceDueAtHours?: number | null, baselineWearPercent?: number | null, baselineMethod: BaselineMethod, baselineConfidence: BaselineConfidence, baselineSetAt?: string | null, lastServicedAt?: string | null, location: ComponentLocation, status: ComponentStatus } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, email: string, name?: string | null, avatarUrl?: string | null, onboardingCompleted: boolean, hasAcceptedCurrentTerms: boolean, location?: string | null, age?: number | null, role: UserRole, mustChangePassword: boolean, isFoundingRider: boolean, hoursDisplayPreference?: string | null, predictionMode?: string | null, pairedComponentMigrationSeenAt?: string | null, createdAt: string } | null };

export type RecentRidesQueryVariables = Exact<{
  take?: InputMaybe<Scalars['Int']['input']>;
}>;


export type RecentRidesQuery = { __typename?: 'Query', rides: Array<{ __typename?: 'Ride', id: string, startTime: string, durationSeconds: number, distanceMiles: number, elevationGainFeet: number, rideType: string, bikeId?: string | null, location?: string | null }> };

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
  components {
    ...ComponentFields
  }
  predictions {
    ...PredictionFields
  }
  createdAt
  updatedAt
}
    ${ComponentFieldsFragmentDoc}
${PredictionFieldsFragmentDoc}`;
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
export const GearLightDocument = gql`
    query GearLight {
  bikes {
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
  bikes {
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
    pairedComponentMigrationSeenAt
    createdAt
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
export const RecentRidesDocument = gql`
    query RecentRides($take: Int) {
  rides(take: $take) {
    id
    startTime
    durationSeconds
    distanceMiles
    elevationGainFeet
    rideType
    bikeId
    location
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