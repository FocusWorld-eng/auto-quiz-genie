import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GradeRequest {
  submissionId: string;
}

interface ShortAnswerGrading {
  score: number;
  maxScore: number;
  feedback: string;
  confidence: 'high' | 'medium' | 'low';
  requiresReview: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the JWT token from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { submissionId }: GradeRequest = await req.json();

    if (!submissionId) {
      return new Response(JSON.stringify({ error: 'Submission ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Grading submission: ${submissionId}`);

    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from('quiz_submissions')
      .select(`
        *,
        quizzes (*)
      `)
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return new Response(JSON.stringify({ error: 'Submission not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user can grade this submission (owner or teacher who created the quiz)
    if (submission.student_id !== user.id && submission.quizzes.created_by !== user.id) {
      return new Response(JSON.stringify({ error: 'Not authorized to grade this submission' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all responses for this submission
    const { data: responses, error: responsesError } = await supabase
      .from('question_responses')
      .select(`
        *,
        questions (*)
      `)
      .eq('submission_id', submissionId);

    if (responsesError) {
      console.error('Error fetching responses:', responsesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch responses' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalScore = 0;
    let maxPossibleScore = 0;
    let needsReview = false;
    const gradingResults = [];

    // Process each response
    for (const response of responses) {
      const question = response.questions;
      maxPossibleScore += question.points;

      if (question.question_type === 'multiple_choice') {
        // Grade multiple choice immediately
        const selectedIndex = parseInt(response.student_answer);
        const isCorrect = selectedIndex === question.correct_answer_index;
        const pointsEarned = isCorrect ? question.points : 0;
        totalScore += pointsEarned;

        // Update response
        await supabase
          .from('question_responses')
          .update({
            is_correct: isCorrect,
            points_earned: pointsEarned,
          })
          .eq('id', response.id);

        gradingResults.push({
          questionId: question.id,
          questionType: 'multiple_choice',
          isCorrect,
          pointsEarned,
          maxPoints: question.points
        });

      } else if (question.question_type === 'short_answer') {
        // Grade short answer using AI
        const grading = await gradeShortAnswer(
          question.question_text,
          response.student_answer,
          question.sample_answer,
          question.grading_rubric,
          question.points
        );

        totalScore += grading.score;
        
        if (grading.requiresReview) {
          needsReview = true;
        }

        // Update response
        await supabase
          .from('question_responses')
          .update({
            is_correct: grading.score >= (question.points * 0.7), // 70% threshold for "correct"
            points_earned: grading.score,
            ai_feedback: grading.feedback,
            confidence: grading.confidence,
            requires_manual_review: grading.requiresReview,
          })
          .eq('id', response.id);

        gradingResults.push({
          questionId: question.id,
          questionType: 'short_answer',
          pointsEarned: grading.score,
          maxPoints: question.points,
          feedback: grading.feedback,
          confidence: grading.confidence,
          requiresReview: grading.requiresReview
        });
      }
    }

    // Update submission with final score
    await supabase
      .from('quiz_submissions')
      .update({
        total_score: totalScore,
        max_possible_score: maxPossibleScore,
        is_completed: true,
        needs_review: needsReview,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    console.log(`Grading completed. Score: ${totalScore}/${maxPossibleScore}, Needs review: ${needsReview}`);

    return new Response(JSON.stringify({
      submissionId,
      totalScore,
      maxPossibleScore,
      percentage: (totalScore / maxPossibleScore) * 100,
      needsReview,
      results: gradingResults,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in grade function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function gradeShortAnswer(
  questionText: string,
  studentAnswer: string,
  sampleAnswer: string,
  gradingRubric: string,
  maxPoints: number
): Promise<ShortAnswerGrading> {
  const prompt = `You are an expert teacher grading a short answer question. Grade the student's response objectively and provide constructive feedback.

**Question:** ${questionText}

**Student Answer:** ${studentAnswer}

**Sample Answer:** ${sampleAnswer}

**Grading Rubric:** ${gradingRubric || 'Grade based on accuracy, completeness, and understanding of key concepts.'}

**Maximum Points:** ${maxPoints}

**Instructions:**
1. Award points based on the accuracy and completeness of the student's answer
2. Compare against the sample answer and rubric
3. Provide specific, constructive feedback
4. Assign a confidence level:
   - HIGH: Very clear right/wrong, objective criteria met
   - MEDIUM: Some subjective elements, but clear standards applied
   - LOW: Highly subjective, borderline cases, or unusual responses

**Return ONLY a valid JSON object in this exact format:**

{
  "score": [number between 0 and ${maxPoints}],
  "maxScore": ${maxPoints},
  "feedback": "Specific feedback explaining the score, highlighting what was correct and what could be improved",
  "confidence": "high|medium|low",
  "requiresReview": [true if confidence is low or if this is a borderline case that might benefit from human review]
}

**Important:** Return ONLY the JSON object, no additional text.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: 'You are an expert teacher and grader. Always return valid JSON responses only.' },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      // Return a fallback grading
      return {
        score: 0,
        maxScore: maxPoints,
        feedback: 'Unable to grade automatically. Manual review required.',
        confidence: 'low',
        requiresReview: true
      };
    }

    const data = await response.json();
    const gradingContent = data.choices[0].message.content.trim();
    
    const grading = JSON.parse(gradingContent);
    
    // Validate the response
    if (typeof grading.score !== 'number' || 
        grading.score < 0 || 
        grading.score > maxPoints ||
        !grading.feedback ||
        !['high', 'medium', 'low'].includes(grading.confidence)) {
      throw new Error('Invalid grading format');
    }

    return {
      score: Math.min(Math.max(grading.score, 0), maxPoints), // Ensure score is within bounds
      maxScore: maxPoints,
      feedback: grading.feedback,
      confidence: grading.confidence as 'high' | 'medium' | 'low',
      requiresReview: grading.requiresReview || grading.confidence === 'low'
    };

  } catch (error) {
    console.error('Error grading short answer:', error);
    // Return a safe fallback
    return {
      score: 0,
      maxScore: maxPoints,
      feedback: 'Automatic grading failed. Manual review required.',
      confidence: 'low',
      requiresReview: true
    };
  }
}