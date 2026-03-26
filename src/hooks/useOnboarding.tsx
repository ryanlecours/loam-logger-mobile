import React, { createContext, useContext, useState, useCallback } from 'react';

export interface SpokesImage {
  url: string;
  colorKey?: string;
}

/**
 * Bike data from 99Spokes search
 */
export interface SpokesBike {
  id: string;
  maker: string;
  model: string;
  year: number;
  family: string;
  category: string;
  subcategory: string | null;
  thumbnailUrl?: string;
  url?: string;
  spokesUrl?: string;
  buildKind?: string;
  isFrameset?: boolean;
  isEbike?: boolean;
  gender?: string;
  frameMaterial?: string;
  hangerStandard?: string;
  travelFork?: number;
  travelRear?: number;
  batteryWh?: number;
  motorMaker?: string;
  motorModel?: string;
  motorPowerW?: number;
  motorTorqueNm?: number;
  components?: SpokesComponents;
  images?: SpokesImage[];
}

export interface SpokesComponent {
  make?: string;
  maker?: string;
  model?: string;
  description?: string;
  display?: string;
  kind?: string;
  material?: string;
}

export interface SpokesComponents {
  fork?: SpokesComponent;
  shock?: SpokesComponent;
  rearShock?: SpokesComponent;
  drivetrain?: SpokesComponent;
  wheels?: SpokesComponent;
  rims?: SpokesComponent;
  tires?: SpokesComponent;
  dropper?: SpokesComponent;
  seatpost?: SpokesComponent;
  stem?: SpokesComponent;
  handlebar?: SpokesComponent;
  saddle?: SpokesComponent;
  brakes?: SpokesComponent;
  rearDerailleur?: SpokesComponent;
  crank?: SpokesComponent;
  cassette?: SpokesComponent;
  chain?: SpokesComponent;
  headset?: SpokesComponent;
  bottomBracket?: SpokesComponent;
  pedals?: SpokesComponent;
  motor?: SpokesComponent & { powerW?: number; torqueNm?: number };
  battery?: SpokesComponent & { capacityWh?: number };
}

/**
 * Onboarding data collected across multiple screens
 */
interface OnboardingData {
  age: number | null;
  location: string | null;
  selectedBike: SpokesBike | null;
  // Manual bike entry (if not using 99Spokes)
  manualBike: {
    make: string;
    model: string;
    year: number | null;
  } | null;
  // Additional bike details
  nickname: string;
  notes: string;
  selectedImageUrl: string | null;
  acquisitionCondition: 'NEW' | 'USED';
}

interface OnboardingContextType {
  data: OnboardingData;
  setAge: (age: number) => void;
  setLocation: (location: string) => void;
  setSelectedBike: (bike: SpokesBike | null) => void;
  setManualBike: (bike: { make: string; model: string; year: number | null } | null) => void;
  setNickname: (nickname: string) => void;
  setNotes: (notes: string) => void;
  setSelectedImageUrl: (url: string | null) => void;
  setAcquisitionCondition: (condition: 'NEW' | 'USED') => void;
  reset: () => void;
}

const initialData: OnboardingData = {
  age: null,
  location: null,
  selectedBike: null,
  manualBike: null,
  nickname: '',
  notes: '',
  selectedImageUrl: null,
  acquisitionCondition: 'NEW',
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(initialData);

  const setAge = useCallback((age: number) => {
    setData((prev) => ({ ...prev, age }));
  }, []);

  const setLocation = useCallback((location: string) => {
    setData((prev) => ({ ...prev, location }));
  }, []);

  const setSelectedBike = useCallback((bike: SpokesBike | null) => {
    setData((prev) => ({ ...prev, selectedBike: bike, manualBike: null }));
  }, []);

  const setManualBike = useCallback(
    (bike: { make: string; model: string; year: number | null } | null) => {
      setData((prev) => ({ ...prev, manualBike: bike, selectedBike: null }));
    },
    []
  );

  const setNickname = useCallback((nickname: string) => {
    setData((prev) => ({ ...prev, nickname }));
  }, []);

  const setNotes = useCallback((notes: string) => {
    setData((prev) => ({ ...prev, notes }));
  }, []);

  const setSelectedImageUrl = useCallback((selectedImageUrl: string | null) => {
    setData((prev) => ({ ...prev, selectedImageUrl }));
  }, []);

  const setAcquisitionCondition = useCallback((acquisitionCondition: 'NEW' | 'USED') => {
    setData((prev) => ({ ...prev, acquisitionCondition }));
  }, []);

  const reset = useCallback(() => {
    setData(initialData);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        data,
        setAge,
        setLocation,
        setSelectedBike,
        setManualBike,
        setNickname,
        setNotes,
        setSelectedImageUrl,
        setAcquisitionCondition,
        reset,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
