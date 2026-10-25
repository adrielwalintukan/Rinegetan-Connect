// frontend/src/types/forms.ts
export type StudyInterestStatus = "new" | "contacted" | "closed";
export type StudyInterestLead = {
  id: string;
  name: string;
  contact: string;
  message: string;
  status: StudyInterestStatus;
  created_at: string;
  handled_at: string | null;
};
