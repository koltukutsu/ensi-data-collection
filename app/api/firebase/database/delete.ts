import { NextApiRequest, NextApiResponse } from 'next';
import { database } from '@/lib/firebase/database';
import { runMiddleware, cors } from '@/lib/firebase/cors';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await runMiddleware(req, res, cors);

  if (req.method === 'PUT') {
    const { id, data } = req.body;
    try {
      await database.update('your_collection_name', id, data);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: 'Failed to update document' });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
