import { Room } from "@/components/RoomGrid";
import { NurseAssignment } from "@/components/ScheduleDisplay";
import { SchedulingParams, SchedulingResult } from "./schedulingAlgorithm";
import { supabase } from "@/integrations/supabase/client";

export interface AISchedulingParams extends SchedulingParams {
  // API key is now handled securely in Edge Function
}

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

export async function generateAISchedule(params: AISchedulingParams): Promise<SchedulingResult> {
  const { nurseCount, nurseNames, rooms, prioritizeContinuity = true } = params;
  const occupiedRooms = rooms.filter(room => room.isOccupied);
  
  if (occupiedRooms.length === 0) {
    return {
      assignments: nurseNames.map((name, index) => ({
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
    };
  }

  try {
    console.log('Calling AI scheduling Edge Function...');
    
    const { data, error } = await supabase.functions.invoke('ai-scheduling', {
      body: {
        nurseCount,
        nurseNames,
        rooms,
        prioritizeContinuity
      }
    });

    if (error) {
      throw new Error(`Edge Function error: ${error.message}`);
    }

    if (data.error) {
      throw new Error(data.error);
    }

    const { aiResponse, nurseNames: returnedNurseNames, occupiedRooms: returnedOccupiedRooms, nurseCount: returnedNurseCount } = data;

    if (!aiResponse) {
      throw new Error('No response from OpenAI API');
    }

    // Parse AI response and validate
    const result = parseAIResponse(aiResponse, returnedNurseNames, returnedOccupiedRooms, returnedNurseCount);
    return result;

  } catch (error) {
    console.error('AI Scheduling Error:', error);
    
    // Fallback to regular algorithm if AI fails
    const { generateSchedule } = await import('./schedulingAlgorithm');
    const fallbackResult = generateSchedule(params);
    
    return {
      ...fallbackResult,
      warnings: [
        `AI scheduling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Used fallback algorithm instead',
        ...fallbackResult.warnings
      ]
    };
  }
}

function createAssignmentPrompt(
  nurseCount: number,
  nurseNames: string[],
  occupiedRooms: Room[],
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

function parseAIResponse(
  aiResponse: string,
  nurseNames: string[],
  occupiedRooms: Room[],
  nurseCount: number
): SchedulingResult {
  try {
    // Extract JSON from response (in case AI adds explanation text)
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const warnings: string[] = [...(parsed.warnings || [])];

    // Initialize assignments
    const assignments: NurseAssignment[] = nurseNames.map((name, index) => ({
      id: `nurse-${index}`,
      name,
      rooms: [],
      isCharge: nurseCount === 6 && index === 0,
      isOffCare: nurseCount === 7 && index === 0,
      chemoCount: 0,
      difficultyScore: 0,
      warnings: []
    }));

    // Process AI assignments
    const assignedRoomNumbers = new Set<string>();
    
    for (const aiAssignment of parsed.assignments || []) {
      const nurse = assignments.find(n => n.name === aiAssignment.nurseName);
      if (!nurse) {
        warnings.push(`Unknown nurse: ${aiAssignment.nurseName}`);
        continue;
      }

      for (const roomNumber of aiAssignment.assignedRooms || []) {
        const room = occupiedRooms.find(r => r.number === roomNumber);
        if (!room) {
          warnings.push(`Unknown room: ${roomNumber}`);
          continue;
        }

        if (assignedRoomNumbers.has(roomNumber)) {
          warnings.push(`Room ${roomNumber} assigned to multiple nurses`);
          continue;
        }

        nurse.rooms.push(room);
        room.assignedNurse = nurse.name;
        assignedRoomNumbers.add(roomNumber);

        if (room.isChemo) {
          nurse.chemoCount++;
        }
      }
    }

    // Calculate scores and validate
    assignments.forEach(nurse => {
      nurse.difficultyScore = nurse.rooms.reduce((sum, room) => {
        const weights = { easy: 1, medium: 2, hard: 3 };
        return sum + weights[room.difficulty];
      }, 0);

      // Validate constraints
      if (nurse.chemoCount > 1) {
        nurse.warnings.push(`Has ${nurse.chemoCount} chemo patients (max 1 allowed)`);
        warnings.push(`${nurse.name} assigned ${nurse.chemoCount} chemo patients`);
      }

      if (nurse.isCharge && nurse.rooms.length !== 3) {
        nurse.warnings.push(`Charge nurse should have 3 patients, has ${nurse.rooms.length}`);
        warnings.push(`Charge nurse ${nurse.name} has ${nurse.rooms.length} patients instead of 3`);
      }

      if (nurse.isOffCare && nurse.rooms.length > 0) {
        nurse.warnings.push(`Off-care nurse should have 0 patients, has ${nurse.rooms.length}`);
        warnings.push(`Off-care nurse ${nurse.name} assigned ${nurse.rooms.length} patients`);
      }
    });

    // Check for unassigned rooms
    const unassignedRooms = occupiedRooms.filter(room => !assignedRoomNumbers.has(room.number));
    if (unassignedRooms.length > 0) {
      warnings.push(`${unassignedRooms.length} rooms left unassigned: ${unassignedRooms.map(r => r.number).join(', ')}`);
    }

    return {
      assignments,
      warnings,
      totalRooms: occupiedRooms.length,
      success: warnings.length === 0
    };

  } catch (error) {
    throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}