import { NextApiRequest, NextApiResponse } from 'next';
import { database } from '@/lib/firebase/database';
import { runMiddleware, cors } from '@/lib/firebase/cors';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await runMiddleware(req, res, cors);

  if (req.method === 'GET') {
    const { collectionName } = req.query;
    const unsubscribe = database.subscribe(collectionName as string, (data) => {
      res.status(200).json(data);
    });

    // Return a function to unsubscribe
    res.on('close', () => {
      unsubscribe();
    });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
