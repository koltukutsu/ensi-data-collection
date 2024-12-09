import { NextApiRequest, NextApiResponse } from 'next';
import { cloudStorage } from '@/lib/firebase/cloud-storage';
import { runMiddleware, cors } from '@/lib/firebase/cors';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await runMiddleware(req, res, cors);

  if (req.method === 'DELETE') {
    const { path } = req.query;

    try {
      await cloudStorage.delete(path as string);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete file' });
    }
  } else {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
