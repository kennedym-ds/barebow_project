import { useReducer, useCallback } from 'react';
import type { FaceType, End } from '../../types/models';
import { getRingScore, getFlintScore, isXRing } from '../../utils/scoring';

export interface ShotInProgress {
  x: number;
  y: number;
  score: number;
  is_x: boolean;
  arrow_number: number;
}

export interface SessionLoggerState {
  phase: 'configuring' | 'logging' | 'saving_end' | 'complete';
  sessionId: string | null;
  roundType: string;
  faceSizeCm: number;
  distanceM: number;
  faceType: FaceType;
  xIs11: boolean;
  currentEndNumber: number;
  arrowsPerEnd: number;
  totalArrows: number;
  arrowCount: number; // total arrows in quiver
  shaftDiameterMm: number; // arrow shaft outer diameter for line-break scoring
  activeArrow: number;
  shotsInCurrentEnd: ShotInProgress[];
  savedEnds: End[];
  viewMode: 'current' | 'cumulative';
  bowId?: string;
  arrowId?: string;
}

type Action =
  | { type: 'START_SESSION'; payload: { 
      sessionId: string; 
      roundType: string;
      faceSizeCm: number;
      distanceM: number;
      faceType: FaceType;
      xIs11: boolean;
      arrowsPerEnd: number;
      totalArrows: number;
      arrowCount: number;
      shaftDiameterMm: number;
      bowId?: string;
      arrowId?: string;
    }}
  | { type: 'PLACE_SHOT'; payload: { x: number; y: number } }
  | { type: 'SELECT_ARROW'; payload: number }
  | { type: 'END_SAVED'; payload: End }
  | { type: 'TOGGLE_VIEW' }
  | { type: 'END_SESSION_EARLY' }
  | { type: 'RESET' };

const initialState: SessionLoggerState = {
  phase: 'configuring',
  sessionId: null,
  roundType: '',
  faceSizeCm: 40,
  distanceM: 18,
  faceType: 'WA',
  xIs11: false,
  currentEndNumber: 1,
  arrowsPerEnd: 3,
  totalArrows: 60,
  arrowCount: 12,
  shaftDiameterMm: 5.2,
  activeArrow: 1,
  shotsInCurrentEnd: [],
  savedEnds: [],
  viewMode: 'current',
};

function reducer(state: SessionLoggerState, action: Action): SessionLoggerState {
  switch (action.type) {
    case 'START_SESSION':
      return {
        ...state,
        phase: 'logging',
        sessionId: action.payload.sessionId,
        roundType: action.payload.roundType,
        faceSizeCm: action.payload.faceSizeCm,
        distanceM: action.payload.distanceM,
        faceType: action.payload.faceType,
        xIs11: action.payload.xIs11,
        arrowsPerEnd: action.payload.arrowsPerEnd,
        totalArrows: action.payload.totalArrows,
        arrowCount: action.payload.arrowCount,
        shaftDiameterMm: action.payload.shaftDiameterMm,
        bowId: action.payload.bowId,
        arrowId: action.payload.arrowId,
        currentEndNumber: 1,
        activeArrow: 1,
        shotsInCurrentEnd: [],
        savedEnds: [],
      };

    case 'PLACE_SHOT': {
      const { x, y } = action.payload;
      const radius = Math.sqrt(x * x + y * y);
      
      // Calculate score (using arrow diameter for line-break rule)
      const score = state.faceType === 'Flint' 
        ? getFlintScore(radius, state.faceSizeCm, state.shaftDiameterMm)
        : getRingScore(radius, state.faceSizeCm, state.xIs11, state.shaftDiameterMm);
      
      const is_x = isXRing(radius, state.faceSizeCm, state.faceType, state.shaftDiameterMm);

      // Remove any existing shot for this arrow
      const filteredShots = state.shotsInCurrentEnd.filter(
        s => s.arrow_number !== state.activeArrow
      );

      const newShot: ShotInProgress = {
        x,
        y,
        score,
        is_x,
        arrow_number: state.activeArrow,
      };

      const updatedShots = [...filteredShots, newShot];

      // Auto-advance to next unused arrow (scan full quiver)
      const shotNums = new Set(updatedShots.map(s => s.arrow_number));
      let nextArrow = state.activeArrow;
      let found = false;

      // End is full when we've placed arrowsPerEnd shots — don't advance
      if (updatedShots.length < state.arrowsPerEnd) {
        // Try to find next unshot arrow > current
        for (let i = state.activeArrow + 1; i <= state.arrowCount; i++) {
          if (!shotNums.has(i)) {
            nextArrow = i;
            found = true;
            break;
          }
        }

        // If not found, wrap around from 1
        if (!found) {
          for (let i = 1; i <= state.arrowCount; i++) {
            if (!shotNums.has(i)) {
              nextArrow = i;
              found = true;
              break;
            }
          }
        }
      }

      return {
        ...state,
        shotsInCurrentEnd: updatedShots,
        activeArrow: found ? nextArrow : state.activeArrow,
      };
    }

    case 'SELECT_ARROW':
      return {
        ...state,
        activeArrow: action.payload,
      };

    case 'END_SAVED': {
      const newSavedEnds = [...state.savedEnds, action.payload];
      const totalShotsSoFar = newSavedEnds.reduce((sum, end) => sum + end.shots.length, 0);
      
      // Check if complete
      const isComplete = totalShotsSoFar >= state.totalArrows;

      return {
        ...state,
        phase: isComplete ? 'complete' : 'logging',
        savedEnds: newSavedEnds,
        currentEndNumber: state.currentEndNumber + 1,
        shotsInCurrentEnd: [],
        activeArrow: 1,
      };
    }

    case 'TOGGLE_VIEW':
      return {
        ...state,
        viewMode: state.viewMode === 'current' ? 'cumulative' : 'current',
      };

    case 'END_SESSION_EARLY':
      return {
        ...state,
        phase: 'complete',
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

export function useSessionLogger() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const startSession = useCallback((config: {
    sessionId: string;
    roundType: string;
    faceSizeCm: number;
    distanceM: number;
    faceType: FaceType;
    xIs11: boolean;
    arrowsPerEnd: number;
    totalArrows: number;
    arrowCount: number;
    shaftDiameterMm: number;
    bowId?: string;
    arrowId?: string;
  }) => {
    dispatch({ type: 'START_SESSION', payload: config });
  }, []);

  const placeShot = useCallback((x: number, y: number) => {
    dispatch({ type: 'PLACE_SHOT', payload: { x, y } });
  }, []);

  const selectArrow = useCallback((num: number) => {
    dispatch({ type: 'SELECT_ARROW', payload: num });
  }, []);

  const endSaved = useCallback((end: End) => {
    dispatch({ type: 'END_SAVED', payload: end });
  }, []);

  const toggleView = useCallback(() => {
    dispatch({ type: 'TOGGLE_VIEW' });
  }, []);

  const endSessionEarly = useCallback(() => {
    dispatch({ type: 'END_SESSION_EARLY' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    state,
    actions: {
      startSession,
      placeShot,
      selectArrow,
      endSaved,
      toggleView,
      endSessionEarly,
      reset,
    },
  };
}
