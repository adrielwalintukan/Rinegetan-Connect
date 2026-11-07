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
export type PrayerRequestStatus = "new" | "prayed" | "closed";
export type PrayerRequest = {
  id: string;
  name: string;
  contact: string;
  request: string;
  wants_contact: boolean;
  status: PrayerRequestStatus;
  created_at: string;
  handled_at: string | null;
};
export type VisitStatus = "new" | "contacted" | "closed";
export type VisitSubmission = {
  id: string;
  name: string;
  contact: string;
  visit_date: string | null;
  party_size: number | null;
  message: string;
  status: VisitStatus;
  created_at: string;
  handled_at: string | null;
};
export type PastoralCounts = { study_interest_leads: number; prayer_requests: number; visitor_submissions: number };
