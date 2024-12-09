import { NextApiRequest, NextApiResponse } from 'next';
import { cloudStorage } from '@/lib/firebase/cloud-storage';
import { runMiddleware, cors } from '@/lib/firebase/cors';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await runMiddleware(req, res, cors);

  if (req.method === 'POST') {
    const form = new formidable.IncomingForm();

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({ error: 'Error parsing the files' });
      }

      const file = files.file?.[0]; // Assuming you're uploading a single file
      const { path } = fields;

      if (!file || !path) {
        return res.status(400).json({ error: 'No file or path provided' });
      }
      try {
        const fileBuffer = await fs.promises.readFile(file.filepath);
        const result = await cloudStorage.upload(
          path[0],
          new File([fileBuffer], file.originalFilename || 'file')
        );
        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to upload file' });
      }
    });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
