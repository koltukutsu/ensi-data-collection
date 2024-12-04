'use client';
import { Checkbox } from '@/components/ui/checkbox';
import { Employee, Task } from '@/constants/data';
import { ColumnDef } from '@tanstack/react-table';
import { CellAction } from './cell-action';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

export const columns: ColumnDef<Task>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
  // leaf id, leaf path, instructions
  {
    accessorKey: 'leaf_id',
    header: 'Leaf ID'
  },
  {
    accessorKey: 'instruction_prompt',
    header: 'Instruction Prompt'
  },
  {
    accessorKey: 'leaf_path_list',
    header: 'Leaf Path',
    cell: ({ row }) => {
      const paths = row.original.leaf_path_list;
      const [isOpen, setIsOpen] = useState(false);

      return (
        <>
          <Button variant="ghost" onClick={() => setIsOpen(true)}>
            {paths.length} paths
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Leaf Paths</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {paths.map((path, index) => (
                  <div key={index} className="text-sm">
                    {index + 1}. {path}
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </>
      );
    }
  },

  {
    accessorKey: 'created_at',
    header: 'Created At'
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const router = useRouter();

      return (
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            router.push(`/dashboard/tasks/${row.original.document_id}`)
          }
        >
          View Details
        </Button>
      );
    }
  }

  // {
  //   accessorKey: 'name',
  //   header: 'NAME'
  // },
  // {
  //   accessorKey: 'country',
  //   header: 'COUNTRY'
  // },
  // {
  //   accessorKey: 'email',
  //   header: 'EMAIL'
  // },
  // {
  //   accessorKey: 'job',
  //   header: 'COMPANY'
  // },
  // {
  //   accessorKey: 'gender',
  //   header: 'GENDER'
  // },
  // {
  //   id: 'actions',
  //   cell: ({ row }) => <CellAction data={row.original} />
  // }
];
