import { NextApiRequest, NextApiResponse } from 'next';
import { database } from '@/lib/firebase/database';
import { runMiddleware, cors } from '@/lib/firebase/cors';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await runMiddleware(req, res, cors);

  if (req.method === 'GET') {
    const { id } = req.query;
    try {
      const result = await database.get('your_collection_name', id as string);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get document' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
