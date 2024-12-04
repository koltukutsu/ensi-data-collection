// import { createReadStream } from 'fs';
// import FormData from 'form-data';
// import fetch from 'node-fetch';

// export interface WhisperResponse {
//   text: string;
// }

// export async function transcribeAudio(
//   audioFile: File | Blob
// ): Promise<WhisperResponse> {
//   const formData = new FormData();
//   formData.append('file', audioFile);
//   formData.append('model', 'whisper-1');

//   try {
//     const response = await fetch(
//       'https://api.openai.com/v1/audio/transcriptions',
//       {
//         method: 'POST',
//         headers: {
//           Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
//         },
//         body: formData
//       }
//     );

//     if (!response.ok) {
//       throw new Error(
//         `Whisper API error: ${response.status} ${response.statusText}`
//       );
//     }

//     const data = await response.json();
//     return data as WhisperResponse;
//   } catch (error) {
//     console.error('Error transcribing audio:', error);
//     throw error;
//   }
// }
