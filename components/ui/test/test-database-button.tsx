'use client';

import { Button } from '@/components/ui/button';

export default function TestDatabaseButton() {
  async function createTestEmployee() {
    try {
      const db = await import('@/lib/firebase/database');
      await db.database.create('employees', {
        name: 'Test Employee',
        email: 'test@example.com',
        job: 'Developer'
      });
      alert('Employee created successfully!');
    } catch (error: any) {
      console.error('Error creating employee:', error);
      const errorMessage =
        error.code === 'permission-denied'
          ? 'Permission denied. Please check Firebase security rules.'
          : 'Failed to create employee';
      alert(errorMessage);
    }
  }

  return (
    <Button onClick={createTestEmployee} variant="default" className="mr-2">
      Test Database
    </Button>
  );
}
