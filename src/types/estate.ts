export interface Estate {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  isLocked?: boolean;
  createdBy?: string;
}
