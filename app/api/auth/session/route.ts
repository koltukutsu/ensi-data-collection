import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    return new Response(JSON.stringify(session), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Authentication failed' }), {
      status: 500
    });
  }
}
