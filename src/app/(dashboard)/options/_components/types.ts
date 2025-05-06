export interface Step {
  title: string;
  description: string;
  status: 'complete' | 'current' | 'upcoming' | 'hidden';
} 