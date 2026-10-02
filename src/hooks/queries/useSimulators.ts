import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { simulatorApi } from '../../api/api';

export const useSimulators = () => {
  return useQuery({
    queryKey: queryKeys.simulators.list(),
    queryFn: () => simulatorApi.getAll(),
    staleTime: 60 * 60 * 1000, // 1 hour (1.2 MB data!)
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
