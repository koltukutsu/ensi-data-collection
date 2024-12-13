'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, isValid } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const formatDate = (dateString: string) => {
  try {
    // First try parsing as ISO string
    const date = new Date(dateString);
    if (isValid(date)) {
      return formatDistanceToNow(date, { addSuffix: true });
    }

    // If it's a Firebase Timestamp string (seconds)
    if (dateString.includes('seconds')) {
      const seconds = parseInt(dateString.match(/seconds=(\d+)/)?.[1] || '0');
      const date = new Date(seconds * 1000);
      if (isValid(date)) {
        return formatDistanceToNow(date, { addSuffix: true });
      }
    }

    return 'Invalid date';
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

export const columns = {
  voiceData: [
    {
      accessorKey: 'name',
      header: 'User',
      cell: ({ row }) => {
        const name = row.getValue('name') as string;
        const email = row.getValue('email') as string;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{getInitials(name)}</AvatarFallback>
            </Avatar>
            <div className="hidden flex-col sm:flex">
              <span className="text-sm font-medium">{name}</span>
              <span className="text-xs text-muted-foreground">{email}</span>
            </div>
            <div className="flex flex-col sm:hidden">
              <span className="text-sm font-medium">{name}</span>
            </div>
          </div>
        );
      }
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => {
        const email = row.getValue('email') as string;
        return <div className="hidden sm:block">{email}</div>;
      }
    },
    {
      accessorKey: 'dailyActionsCompleted',
      header: "Today's",
      cell: ({ row }) => {
        const value = row.getValue('dailyActionsCompleted') as number;
        return (
          <Badge variant={value > 0 ? 'success' : 'secondary'}>{value}</Badge>
        );
      }
    },
    {
      accessorKey: 'totalActionsCompleted',
      header: 'Total',
      cell: ({ row }) => {
        const value = row.getValue('totalActionsCompleted') as number;
        return (
          <Badge variant="outline" className="font-bold">
            {value}
          </Badge>
        );
      }
    },
    {
      accessorKey: 'lastContribution',
      header: 'Last',
      cell: ({ row }) => {
        const value = row.getValue('lastContribution') as string;
        if (value === 'Never')
          return <span className="text-muted-foreground">Never</span>;
        return <span className="whitespace-nowrap">{formatDate(value)}</span>;
      }
    }
  ] as ColumnDef<any>[],

  wakeWord: [
    {
      accessorKey: 'name',
      header: 'User',
      cell: ({ row }) => {
        const name = row.getValue('name') as string;
        const email = row.getValue('email') as string;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{getInitials(name)}</AvatarFallback>
            </Avatar>
            <div className="hidden flex-col sm:flex">
              <span className="text-sm font-medium">{name}</span>
              <span className="text-xs text-muted-foreground">{email}</span>
            </div>
            <div className="flex flex-col sm:hidden">
              <span className="text-sm font-medium">{name}</span>
            </div>
          </div>
        );
      }
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => {
        const email = row.getValue('email') as string;
        return <div className="hidden sm:block">{email}</div>;
      }
    },
    {
      accessorKey: 'allowedCount',
      header: 'Allowed',
      cell: ({ row }) => {
        const value = row.getValue('allowedCount') as number;
        return <Badge variant="success">{value}</Badge>;
      }
    },
    {
      accessorKey: 'rejectedCount',
      header: 'Rejected',
      cell: ({ row }) => {
        const value = row.getValue('rejectedCount') as number;
        return <Badge variant="destructive">{value}</Badge>;
      }
    },
    {
      accessorKey: 'totalReviewed',
      header: 'Total',
      cell: ({ row }) => {
        const value = row.getValue('totalReviewed') as number;
        return (
          <Badge variant="outline" className="font-bold">
            {value}
          </Badge>
        );
      }
    },
    {
      accessorKey: 'lastReview',
      header: 'Last',
      cell: ({ row }) => {
        const value = row.getValue('lastReview') as string;
        if (!value) return <span className="text-muted-foreground">Never</span>;
        return <span className="whitespace-nowrap">{formatDate(value)}</span>;
      }
    }
  ] as ColumnDef<any>[]
};
