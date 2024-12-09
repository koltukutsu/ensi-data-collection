import { NextApiRequest, NextApiResponse } from 'next';
import { database } from '@/lib/firebase/database';
import { runMiddleware, cors } from '@/lib/firebase/cors';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await runMiddleware(req, res, cors);

  if (req.method === 'POST') {
    const { field, operator, value } = req.body;
    try {
      const results = await database.query(
        'your_collection_name',
        field,
        operator,
        value
      );
      res.status(200).json(results);
    } catch (error) {
      res.status(500).json({ error: 'Failed to query documents' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
