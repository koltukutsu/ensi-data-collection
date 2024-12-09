import { NextApiRequest, NextApiResponse } from 'next';
import { database } from '@/lib/firebase/database';
import { runMiddleware, cors } from '@/lib/firebase/cors';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await runMiddleware(req, res, cors);

  if (req.method === 'POST') {
    try {
      const data = req.body;
      const result = await database.create('your_collection_name', data);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create document' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
