import { NextApiRequest, NextApiResponse } from 'next';
import { cloudStorage } from '@/lib/firebase/cloud-storage';
import { runMiddleware, cors } from '@/lib/firebase/cors';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await runMiddleware(req, res, cors);

  if (req.method === 'GET') {
    const { path } = req.query;

    try {
      const url = await cloudStorage.getUrl(path as string);
      res.status(200).json({ url });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get download URL' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
