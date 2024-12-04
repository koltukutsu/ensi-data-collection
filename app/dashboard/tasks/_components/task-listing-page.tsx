import PageContainer from '@/components/layout/page-container';
import { Button, buttonVariants } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { Employee, Task } from '@/constants/data';
import { searchParamsCache } from '@/lib/searchparams';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import EmployeeTable from './employee-tables';
import { database } from '@/lib/firebase/database';

type TTaskListingPage = {};

export default async function TaskListingPage({}: TTaskListingPage) {
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('q');
  const gender = searchParamsCache.get('gender');
  const pageLimit = searchParamsCache.get('limit');

  const tasks = await database
    .getAll<Task>('sources/leaf_instruction_prompts/prompts')
    .then((data) =>
      data.map((doc) => {
        return doc;
      })
    );
  const totalTasks = tasks.length;
  console.log(tasks.length);

  return (
    <PageContainer scrollable>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <Heading
            title={`Tasks (${totalTasks})`}
            description="Manage tasks "
          />
          <Link
            href={'/dashboard/tasks/new'}
            className={cn(buttonVariants({ variant: 'default' }))}
          >
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Link>
        </div>
        <Separator />
        <EmployeeTable data={tasks} totalData={totalTasks} />
      </div>
    </PageContainer>
  );
}
