import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hospital policies for AI context
const HOSPITAL_POLICIES = `
CRITICAL HOSPITAL ASSIGNMENT POLICIES:
1. CHEMO SAFETY: Maximum 1 chemo patient per nurse (NEVER exceed this)
2. CHARGE NURSE: If 6 nurses total, first nurse is charge nurse with exactly 3 patients (usually hardest cases)
3. OFF-CARE NURSE: If 7 nurses total, first nurse is off-care with 0 patients
4. WORKLOAD BALANCE: Distribute difficulty evenly (easy=1pt, medium=2pts, hard=3pts)
5. PROXIMITY: Keep each nurse's rooms in contiguous blocks when possible
6. CONTINUITY: Maintain nurse-patient relationships from previous shifts when specified

ROOM LAYOUT (contiguous blocks):
- Block 1: 600, 601, 602, 603
- Block 2: 604, 605A, 605B, 606A, 606B  
- Block 3: 607, 608, 609, 610
- Block 4: 611, 612, 613, 614
- Block 5: 615A, 615B, 616A, 616B
- Block 6: 617A, 617B, 618A, 618B
- Block 7: 619, 620, 621
- Block 8: 622, 623
`;

function createAssignmentPrompt(
  nurseCount: number,
  nurseNames: string[],
  occupiedRooms: any[],
  prioritizeContinuity: boolean
): string {
  const roomsData = occupiedRooms.map(room => ({
    number: room.number,
    difficulty: room.difficulty,
    isChemo: room.isChemo,
    previousNurse: room.previousNurse || null
  }));

  return `Create optimal nurse assignments for ${nurseCount} nurses managing ${occupiedRooms.length} occupied rooms.

NURSES: ${nurseNames.join(', ')}

ROOMS DATA:
${JSON.stringify(roomsData, null, 2)}

ASSIGNMENT REQUIREMENTS:
- ${nurseCount === 6 ? `${nurseNames[0]} is CHARGE NURSE (exactly 3 patients)` : ''}
- ${nurseCount === 7 ? `${nurseNames[0]} is OFF-CARE (0 patients)` : ''}
- Maximum 1 chemo patient per nurse
- Balance difficulty scores across nurses
- Keep rooms contiguous when possible
- ${prioritizeContinuity ? 'Prioritize continuity from previous shifts' : 'Ignore previous assignments'}

Return ONLY valid JSON in this exact format:
{
  "assignments": [
    {
      "nurseName": "Nurse Name",
      "assignedRooms": ["600", "601"],
      "reasoning": "Brief explanation of assignment logic"
    }
  ],
  "warnings": ["Any policy violations or concerns"]
}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      console.error('OpenAI API key not found in environment variables');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { nurseCount, nurseNames, rooms, prioritizeContinuity = true } = await req.json();
    
    const occupiedRooms = rooms.filter((room: any) => room.isOccupied);
    
    if (occupiedRooms.length === 0) {
      return new Response(JSON.stringify({
        assignments: nurseNames.map((name: string, index: number) => ({
          id: `nurse-${index}`,
          name,
          rooms: [],
          isCharge: nurseCount === 6 && index === 0,
          isOffCare: nurseCount === 7 && index === 0,
          chemoCount: 0,
          difficultyScore: 0,
          warnings: []
        })),
        warnings: ['No occupied rooms to assign'],
        totalRooms: 0,
        success: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = createAssignmentPrompt(nurseCount, nurseNames, occupiedRooms, prioritizeContinuity);
    
    console.log('Sending request to OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are an expert hospital nurse assignment system. Your job is to create optimal room assignments following strict hospital policies and safety requirements.

${HOSPITAL_POLICIES}

You must return a valid JSON object with the exact structure shown in the user prompt. Be extremely careful with chemo limits and charge nurse requirements.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || response.statusText;
      
      console.error('OpenAI API error:', errorMessage);
      
      if (response.status === 429) {
        throw new Error(`OpenAI quota exceeded. Please check your billing at https://platform.openai.com/usage`);
      } else if (response.status === 401) {
        throw new Error(`Invalid API key. Please check your OpenAI API key.`);
      } else {
        throw new Error(`OpenAI API error (${response.status}): ${errorMessage}`);
      }
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from OpenAI API');
    }

    console.log('AI Response received, parsing...');
    
    // Parse AI response and return the raw response for frontend processing
    return new Response(JSON.stringify({
      aiResponse,
      nurseNames,
      occupiedRooms,
      nurseCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-scheduling function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});