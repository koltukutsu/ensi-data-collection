export type CurrentUser = {
  id: string;
  admin: boolean;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
  dailyActionsCompleted: number;
  dailyActionsTarget: number;
};
