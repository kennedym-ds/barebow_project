import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ArrowShaft, OptimizeRequest, FindSimilarRequest, ArrowSetupCreate, ArrowSetupUpdate } from '../types/models';
import { arrowService } from '../services/arrowService';

export function useArrows() {
  return useQuery({
    queryKey: ['arrows'],
    queryFn: () => arrowService.list(),
  });
}

export function useArrow(id: string | null) {
  return useQuery({
    queryKey: ['arrows', id],
    queryFn: () => arrowService.getById(id!),
    enabled: !!id,
  });
}

export function useCreateArrow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ArrowSetupCreate) => Promise.resolve(arrowService.create(data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['arrows'] }),
  });
}

export function useUpdateArrow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ArrowSetupUpdate }) =>
      Promise.resolve(arrowService.update(id, data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['arrows'] }),
  });
}

export function useDeleteArrow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => Promise.resolve(arrowService.delete(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['arrows'] }),
  });
}

// Shaft sub-resource hooks
export function useShafts(arrowId: string | null) {
  return useQuery({
    queryKey: ['arrows', arrowId, 'shafts'],
    queryFn: () => arrowService.listShafts(arrowId!),
    enabled: !!arrowId,
  });
}

export function useImportShafts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ arrowId, shafts }: { arrowId: string; shafts: Omit<ArrowShaft, 'id' | 'arrow_setup_id'>[] }) =>
      Promise.resolve(arrowService.importShafts(arrowId, shafts)),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['arrows', variables.arrowId, 'shafts'] });
    },
  });
}

export function useDeleteShafts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (arrowId: string) => Promise.resolve(arrowService.deleteShafts(arrowId)),
    onSuccess: (_data, arrowId) => {
      qc.invalidateQueries({ queryKey: ['arrows', arrowId, 'shafts'] });
    },
  });
}

// Arrow analytics hook
export function useArrowAnalytics(arrowId: string | null, outlierThreshold = 2.0) {
  return useQuery({
    queryKey: ['arrows', arrowId, 'analytics', outlierThreshold],
    queryFn: () => arrowService.getAnalytics(arrowId!, outlierThreshold),
    enabled: !!arrowId,
  });
}

// Spine check hook
export function useSpineCheck(arrowId: string | null, bowId: string | null) {
  return useQuery({
    queryKey: ['arrows', arrowId, 'spine-check', bowId],
    queryFn: () => arrowService.spineCheck(arrowId!, bowId!),
    enabled: !!arrowId && !!bowId,
  });
}

// Optimize mutation hook
export function useOptimizeArrows() {
  return useMutation({
    mutationFn: ({ arrowId, request }: { arrowId: string; request: OptimizeRequest }) =>
      Promise.resolve(arrowService.optimize(arrowId, request)),
  });
}

// Find similar mutation hook
export function useFindSimilar() {
  return useMutation({
    mutationFn: ({ arrowId, request }: { arrowId: string; request: FindSimilarRequest }) =>
      Promise.resolve(arrowService.findSimilar(arrowId, request)),
  });
}
