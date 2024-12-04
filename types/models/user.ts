export type CurrentUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
  dailyActionsCompleted: number;
  dailyActionsTarget: number;
};
