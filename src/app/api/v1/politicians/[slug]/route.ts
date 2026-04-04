import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  getPoliticianType,
  getDimensionKeys,
  calculateOverallScore,
} from '@/lib/scoring';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Fetch politician with all related data
    const { data: politician, error } = await supabase
      .from('politicians')
      .select(`
        *,
        positions(
          id,
          title,
          chamber,
          constituency,
          state,
          party,
          assembly_number,
          start_date,
          end_date,
          is_current,
          created_at
        ),
        votes(
          id,
          bill_title,
          bill_id,
          vote_cast,
          vote_date,
          session,
          source_url,
          created_at
        ),
        attendance(
          id,
          session_date,
          session_type,
          present,
          created_at
        ),
        promises(
          id,
          promise_text,
          category,
          status,
          made_date,
          evidence_url,
          source,
          created_at,
          updated_at
        ),
        legal_records(
          id,
          record_type,
          title,
          description,
          court,
          date,
          outcome,
          source_url,
          verified,
          created_at
        ),
        news_articles(
          id,
          headline,
          excerpt,
          source_name,
          source_url,
          published_at,
          category,
          created_at
        ),
        projects(
          id,
          title,
          description,
          category,
          state,
          lga,
          allocated_amount,
          status,
          budget_year,
          created_at,
          updated_at
        ),
        asset_declarations(
          id,
          declaration_year,
          status,
          document_url,
          source,
          created_at
        )
      `)
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Politician not found' },
          { status: 404 }
        );
      }
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch politician', details: error.message },
        { status: 500 }
      );
    }

    // Calculate crowd-sourced accountability score from ratings
    const currentPosition = (politician.positions || []).find(
      (p: { is_current: boolean }) => p.is_current
    ) || (politician.positions || [])[0];
    const chamberStr = currentPosition?.chamber as string | undefined;
    const politicianType = getPoliticianType(chamberStr);
    const dimensionKeys = getDimensionKeys(politicianType);

    // Fetch ratings
    const { data: ratings } = await supabase
      .from('politician_ratings')
      .select('*')
      .eq('politician_id', politician.id);

    const allRatings = ratings || [];
    const dimAverages: Record<string, number> = {};
    for (const key of dimensionKeys) {
      const values = allRatings
        .map((r: Record<string, unknown>) => r[key])
        .filter((v): v is number => typeof v === 'number');
      dimAverages[key] =
        values.length > 0
          ? values.reduce((s, v) => s + v, 0) / values.length
          : 0;
    }
    const accountabilityScore = calculateOverallScore(dimAverages);

    const legalRecords = politician.legal_records || [];
    const hasActiveCases = legalRecords.some((l: { record_type: string }) =>
      ['efcc_investigation', 'efcc_conviction', 'icpc_prosecution', 'cct_proceedings'].includes(l.record_type)
    );

    const promises = politician.promises || [];
    const promisesFulfilled = promises.filter((p: { status: string }) => p.status === 'kept').length;

    const attendanceRecords = politician.attendance || [];
    const attendanceRate = attendanceRecords.length > 0
      ? Math.round((attendanceRecords.filter((a: { present: boolean }) => a.present).length / attendanceRecords.length) * 100)
      : 0;

    const response = {
      ...politician,
      accountability_score: accountabilityScore,
      total_ratings: allRatings.length,
      politician_type: politicianType,
      stats: {
        attendance_rate: attendanceRate,
        total_votes: (politician.votes || []).length,
        votes_yes: (politician.votes || []).filter((v: { vote_cast: string }) => v.vote_cast === 'for').length,
        votes_no: (politician.votes || []).filter((v: { vote_cast: string }) => v.vote_cast === 'against').length,
        votes_abstain: (politician.votes || []).filter((v: { vote_cast: string }) => v.vote_cast === 'abstain').length,
        promises_total: promises.length,
        promises_fulfilled: promisesFulfilled,
        promises_in_progress: promises.filter((p: { status: string }) => p.status === 'in_progress').length,
        promises_broken: promises.filter((p: { status: string }) => p.status === 'broken' || p.status === 'abandoned').length,
        active_legal_cases: legalRecords.filter((l: { record_type: string }) => 
          ['efcc_investigation', 'icpc_prosecution', 'cct_proceedings'].includes(l.record_type)
        ).length,
        total_projects: (politician.projects || []).length,
        completed_projects: (politician.projects || []).filter((p: { status: string }) => p.status === 'completed').length,
      },
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
