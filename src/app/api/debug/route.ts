import { NextResponse } from 'next/server';

// API route to collect client-side errors
export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Add timestamp server-side for accurate logging
    const enhancedData = {
      ...data,
      serverTimestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    };

    // Log error details to server console with clear formatting
    console.error('\n------- CLIENT ERROR -------');
    console.error(`Type: ${enhancedData.type}`);
    console.error(`URL: ${enhancedData.url}`);
    console.error(`Time: ${enhancedData.timestamp}`);
    console.error(`Message: ${enhancedData.message}`);
    console.error('----------------------------\n');

    return NextResponse.json({
      success: true,
      timestamp: enhancedData.serverTimestamp,
    });
  } catch (error) {
    console.error('Error handling debug data:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// API route for health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
}
