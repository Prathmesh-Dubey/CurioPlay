import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { simulatorApi } from '../../api/api';
import { fetchSimulators } from '../../lib/cache/catalog';
import { TTL } from '../../lib/cache/policy';
import { snapshotOf } from '../../lib/cache/snapshot';

/** Simulators, without their source code (≈ 2.4 MB of the raw response); fetched per simulator on launch. */
export const useSimulators = () => {
  return useQuery({
    queryKey: queryKeys.simulators.list(),
    queryFn: fetchSimulators,
    staleTime: TTL.catalog,
    ...snapshotOf('simulators'),
  });
};

export const useSimulator = (simId: string) => {
  return useQuery({
    queryKey: queryKeys.simulators.detail(simId),
    queryFn: () => simulatorApi.getById(simId),
    staleTime: 5 * 60 * 1000,
    enabled: !!simId,
  });
};
