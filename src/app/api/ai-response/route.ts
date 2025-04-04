import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponseServer } from '@/lib/api/ai';
import { AIRequestPayload } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as AIRequestPayload;

    // Check for required fields
    if (!payload.message || !payload.conversationId) {
      return NextResponse.json(
        { error: 'Message and conversationId are required' },
        { status: 400 }
      );
    }

    // Generate AI response
    const aiResponse = await generateAIResponseServer(payload);

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error('Error in AI response API:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
