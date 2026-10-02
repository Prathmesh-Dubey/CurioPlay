import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userApi, type Game, type Simulator } from '@/api/api';
import { useGames, useSimulators } from '@/hooks';

export interface CatalogItem {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  thumbnail: string | null;
  kind: 'game' | 'simulator';
  createdAt: string;
}

const toItem = (x: Game | Simulator, kind: CatalogItem['kind']): CatalogItem => ({
  id: x.id,
  title: x.title,
  description: x.description,
  category: x.category,
  thumbnail: x.thumbnail,
  kind,
  createdAt: x.createdAt,
});

/** Active games + simulators from the real API, shaped for public showcase sections. */
export function useCatalog() {
  const games = useGames();
  const sims = useSimulators();
  const users = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => userApi.getAll(),
    staleTime: 60 * 60 * 1000,
  });

  const data = useMemo(() => {
    // /api/games may also return simulators, so split by `type`.
    const gameItems = (games.data ?? [])
      .filter((g) => g.active !== false && g.type !== 'simulator')
      .map((g) => toItem(g, 'game'));
    const simItems = (sims.data ?? [])
      .filter((s) => s.active !== false)
      .map((s) => toItem(s, 'simulator'));
    const recent = [...gameItems, ...simItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
    return { games: gameItems, simulators: simItems, recent };
  }, [games.data, sims.data]);

  return {
    ...data,
    explorers: users.data?.length,
    isLoading: games.isLoading || sims.isLoading,
    isError: games.isError && sims.isError,
    usersLoading: users.isLoading,
  };
}
