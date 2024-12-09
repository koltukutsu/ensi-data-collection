import { NextApiRequest, NextApiResponse } from 'next';
import { database } from '@/lib/firebase/database';
import { runMiddleware, cors } from '@/lib/firebase/cors';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await runMiddleware(req, res, cors);

  if (req.method === 'GET') {
    try {
      const results = await database.getAll('your_collection_name');
      res.status(200).json(results);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get all documents' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
