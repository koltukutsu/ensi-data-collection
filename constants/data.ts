import { NavItem } from '@/types';

export type User = {
  id: number;
  name: string;
  company: string;
  role: string;
  verified: boolean;
  status: string;
};

export interface WakeDetectionSubmission {
  channels: number;
  filename: string;
  sample_rate: number;
  sample_width: number;
  source: string;
  storage_path: string;
  timestamp: string;
  wake_word: string;
  wake_word_id: string;
  labeled: 'allowed' | 'rejected';
  user_id: string;
}

export const users: User[] = [
  {
    id: 1,
    name: 'Candice Schiner',
    company: 'Dell',
    role: 'Frontend Developer',
    verified: false,
    status: 'Active'
  },
  {
    id: 2,
    name: 'John Doe',
    company: 'TechCorp',
    role: 'Backend Developer',
    verified: true,
    status: 'Active'
  },
  {
    id: 3,
    name: 'Alice Johnson',
    company: 'WebTech',
    role: 'UI Designer',
    verified: true,
    status: 'Active'
  },
  {
    id: 4,
    name: 'David Smith',
    company: 'Innovate Inc.',
    role: 'Fullstack Developer',
    verified: false,
    status: 'Inactive'
  },
  {
    id: 5,
    name: 'Emma Wilson',
    company: 'TechGuru',
    role: 'Product Manager',
    verified: true,
    status: 'Active'
  },
  {
    id: 6,
    name: 'James Brown',
    company: 'CodeGenius',
    role: 'QA Engineer',
    verified: false,
    status: 'Active'
  },
  {
    id: 7,
    name: 'Laura White',
    company: 'SoftWorks',
    role: 'UX Designer',
    verified: true,
    status: 'Active'
  },
  {
    id: 8,
    name: 'Michael Lee',
    company: 'DevCraft',
    role: 'DevOps Engineer',
    verified: false,
    status: 'Active'
  },
  {
    id: 9,
    name: 'Olivia Green',
    company: 'WebSolutions',
    role: 'Frontend Developer',
    verified: true,
    status: 'Active'
  },
  {
    id: 10,
    name: 'Robert Taylor',
    company: 'DataTech',
    role: 'Data Analyst',
    verified: false,
    status: 'Active'
  }
];

export type Task = {
  id: string;
  document_id: string;
  leaf_id: number;
  leaf_path_list: string[];
  instruction_prompt: string;
  created_at: Date;
};

export type Employee = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  street: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  longitude?: number;
  latitude?: number;
  job: string;
  profile_picture?: string | null;
};

export type Product = {
  photo_url: string;
  name: string;
  description: string;
  created_at: string;
  price: number;
  id: number;
  category: string;
  updated_at: string;
};

export const navItems: NavItem[] = [
  {
    title: 'Main Panel',
    url: '/dashboard/panel',
    icon: 'dashboard',
    isActive: true,
    shortcut: ['p', 'p'],
    items: []
  },
  {
    title: 'Voice Data Action',
    url: '/dashboard/voice-data-action',
    icon: 'book',
    isActive: false,
    shortcut: ['v', 'v'],
    items: []
  },
  {
    title: 'Wake Word Review',
    url: '/dashboard/wake-detection',
    icon: 'book',
    isActive: false,
    shortcut: ['w', 'w'],
    items: []
  },
  {
    title: 'Leaderboard',
    url: '/dashboard/leader-board',
    icon: 'user2',
    shortcut: ['l', 'l'],
    isActive: false,
    items: []
  }
  // {
  //   title: 'Assign Tasks',
  //   url: '/dashboard/assign-tasks',
  //   icon: 'task',
  //   shortcut: ['a', 'a'],
  //   isActive: false,
  //   items: []
  // },
  // {
  //   title: 'Tasks',
  //   url: '/dashboard/tasks',
  //   icon: 'work',
  //   shortcut: ['t', 't'],
  //   isActive: false,
  //   items: []
  // }
];
