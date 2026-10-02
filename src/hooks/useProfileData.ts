import { useState, useEffect } from "react";
import { User, ProfileResponse, Achievement, UserAchievement, profileApi } from "../api/api";
import { useProfile, useAchievements, useUserAchievements, useUpdateProfile } from "../hooks";
import { queryKeys } from "../lib/queryKeys";

export interface ProfileDataState {
  profile: ProfileResponse | null;
  achievements: Achievement[];
  unlockedIds: string[];
  loading: boolean;
  statusMsg: string;
  setStatusMsg: (msg: string) => void;
  updateProfile: (updates: Partial<ProfileResponse>) => Promise<ProfileResponse>;
}

export function useProfileData(user: User | null, refreshTrigger: number): ProfileDataState {
  const userId = user?.id || null;

  const { data: profile = null, isLoading: isLoadingProfile } = useProfile(userId);
  const { data: achievements = [], isLoading: isLoadingAchievements } = useAchievements();
  const { data: userAchievements = [], isLoading: isLoadingUserAch } = useUserAchievements(userId);

  const [statusMsg, setStatusMsg] = useState("");

  const unlockedIds = userAchievements.map(ua => ua.achievementId);
  const loading = (isLoadingProfile || isLoadingAchievements || isLoadingUserAch) && !!userId;

  const updateMutation = useUpdateProfile();

  const updateProfile = async (updates: Partial<ProfileResponse>) => {
    if (!user) throw new Error("No user logged in.");
    
    let currentProfile = profile;
    if (!currentProfile) {
      currentProfile = await profileApi.create({ userId: user.id });
    }

    // Await the mutation
    const updated = await updateMutation.mutateAsync({ userId: user.id, data: updates });
    return updated;
  };

  return { profile, achievements, unlockedIds, loading, statusMsg, setStatusMsg, updateProfile };
}
