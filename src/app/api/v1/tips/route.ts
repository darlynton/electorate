import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

const tipSchema = z.object({
  politician_id: z.string().uuid(),
  category: z.enum(['corruption', 'performance', 'promise', 'attendance', 'other']),
  title: z.string().min(10).max(200),
  description: z.string().min(50).max(5000),
  evidence_url: z.string().url().optional(),
  anonymous: z.boolean().default(true),
  contact_email: z.string().email().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = tipSchema.parse(body);

    // Get user ID if authenticated (via Clerk)
    // In production, extract from auth header
    const userId = null; // Anonymous by default

    const { data: tip, error } = await supabase
      .from('tips')
      .insert({
        politician_id: validated.politician_id,
        user_id: userId,
        category: validated.category,
        title: validated.title,
        description: validated.description,
        evidence_url: validated.evidence_url,
        anonymous: validated.anonymous,
        contact_email: validated.anonymous ? null : validated.contact_email,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to submit tip' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tip submitted successfully. Our team will review it.',
      data: {
        id: tip.id,
        status: tip.status,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid tip data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const politicianId = searchParams.get('politician_id');
    const status = searchParams.get('status') || 'verified';

    if (!politicianId) {
      return NextResponse.json(
        { error: 'politician_id is required' },
        { status: 400 }
      );
    }

    // Only return verified tips publicly
    const { data: tips, error } = await supabase
      .from('tips')
      .select(`
        id,
        category,
        title,
        description,
        evidence_url,
        anonymous,
        status,
        created_at
      `)
      .eq('politician_id', politicianId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tips' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tips,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
