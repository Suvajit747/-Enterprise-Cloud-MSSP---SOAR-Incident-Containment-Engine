import { useQuery } from "@tanstack/react-query";
import { fetchPlaybooks } from "@/api/playbooks";
import { queryKeys } from "./queryKeys";

export function usePlaybooks() {
  return useQuery({
    queryKey: queryKeys.playbooks(),
    queryFn: fetchPlaybooks,
    staleTime: 5 * 60 * 1000,
  });
}
