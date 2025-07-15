import { Room } from "@/components/RoomGrid";
import { NurseAssignment } from "@/components/ScheduleDisplay";

export interface SchedulingParams {
  nurseCount: 5 | 6 | 7;
  nurseNames: string[];
  rooms: Room[];
  prioritizeContinuity?: boolean;
}

export interface SchedulingResult {
  assignments: NurseAssignment[];
  warnings: string[];
  totalRooms: number;
  success: boolean;
}

// Room proximity groups for optimal assignment (contiguous blocks)
const PROXIMITY_GROUPS = {
  'block-1': ['600', '601', '602', '603'],
  'block-2': ['604', '605A', '605B', '606A', '606B'],
  'block-3': ['607', '608', '609', '610'],
  'block-4': ['611', '612', '613', '614'],
  'block-5': ['615A', '615B', '616A', '616B'],
  'block-6': ['617A', '617B', '618A', '618B'],
  'block-7': ['619', '620', '621'],
  'block-8': ['622', '623']
};

// Difficulty scoring system
const DIFFICULTY_WEIGHTS = {
  easy: 1,
  medium: 2,
  hard: 3
};

export function generateSchedule(params: SchedulingParams): SchedulingResult {
  const { nurseCount, nurseNames, rooms, prioritizeContinuity = true } = params;
  const occupiedRooms = rooms.filter(room => room.isOccupied);
  const warnings: string[] = [];
  
  // Clear previous assignments
  occupiedRooms.forEach(room => room.assignedNurse = undefined);
  
  // Initialize nurse assignments
  const assignments: NurseAssignment[] = nurseNames.map((name, index) => ({
    id: `nurse-${index}`,
    name,
    rooms: [],
    isCharge: false,
    isOffCare: false,
    chemoCount: 0,
    difficultyScore: 0,
    warnings: []
  }));

  // Handle special nurse roles based on count
  if (nurseCount === 6) {
    // 1 charge nurse with 3 patients (usually hardest)
    assignments[0].isCharge = true;
  } else if (nurseCount === 7) {
    // 1 off-care nurse with no patients
    assignments[0].isOffCare = true;
  }

  // If no occupied rooms, return empty assignments
  if (occupiedRooms.length === 0) {
    return {
      assignments,
      warnings: ['No occupied rooms to assign'],
      totalRooms: 0,
      success: true
    };
  }

  // Sort rooms by difficulty (hardest first for charge nurse)
  const sortedRooms = [...occupiedRooms].sort((a, b) => {
    const diffA = DIFFICULTY_WEIGHTS[a.difficulty];
    const diffB = DIFFICULTY_WEIGHTS[b.difficulty];
    return diffB - diffA;
  });

  // Separate chemo rooms for special handling
  const chemoRooms = sortedRooms.filter(room => room.isChemo);
  const nonChemoRooms = sortedRooms.filter(room => !room.isChemo);

  // Calculate target room counts per nurse
  const activeNurses = assignments.filter(nurse => !nurse.isOffCare);
  const totalActiveNurses = activeNurses.length;
  
  let targetRoomsPerNurse: number[];
  if (nurseCount === 6) {
    // Charge nurse gets 3, others split remaining
    const remainingRooms = occupiedRooms.length - 3;
    const regularNurses = 5;
    const regularRoomsPerNurse = Math.floor(remainingRooms / regularNurses);
    targetRoomsPerNurse = [3, ...Array(regularNurses).fill(regularRoomsPerNurse)];
    
    // Distribute any remaining rooms
    const extraRooms = remainingRooms % regularNurses;
    for (let i = 0; i < extraRooms; i++) {
      targetRoomsPerNurse[i + 1]++;
    }
  } else {
    // Equal distribution for 5 or 7 nurses (7 excludes off-care)
    const baseRoomsPerNurse = Math.floor(occupiedRooms.length / totalActiveNurses);
    const extraRooms = occupiedRooms.length % totalActiveNurses;
    
    targetRoomsPerNurse = Array(totalActiveNurses).fill(baseRoomsPerNurse);
    for (let i = 0; i < extraRooms; i++) {
      targetRoomsPerNurse[i]++;
    }
  }

  // Step 1: Assign continuity rooms (returning nurses get their previous patients)
  if (prioritizeContinuity) {
    assignContinuityRooms(occupiedRooms, activeNurses, nurseNames);
  }

  // Step 2: Assign chemo rooms first (max 1 per nurse)
  const chemoAssignments = new Set<number>();
  const availableChemoRooms = chemoRooms.filter(room => !room.assignedNurse);
  
  availableChemoRooms.forEach(room => {
    for (let i = 0; i < activeNurses.length; i++) {
      if (!chemoAssignments.has(i) && activeNurses[i].rooms.length < targetRoomsPerNurse[i]) {
        activeNurses[i].rooms.push(room);
        activeNurses[i].chemoCount++;
        chemoAssignments.add(i);
        room.assignedNurse = activeNurses[i].name;
        break;
      }
    }
  });

  // Check for unassigned chemo rooms
  const unassignedChemo = availableChemoRooms.filter(room => !room.assignedNurse);
  if (unassignedChemo.length > 0) {
    warnings.push(`${unassignedChemo.length} chemo rooms could not be assigned (max 1 per nurse)`);
  }

  // Step 3: Assign remaining non-chemo rooms using contiguous block algorithm
  const remainingRooms = nonChemoRooms.filter(room => !room.assignedNurse);
  assignRoomsByContiguousBlocks(remainingRooms, activeNurses, targetRoomsPerNurse);

  // Calculate final statistics and warnings
  activeNurses.forEach(nurse => {
    nurse.difficultyScore = nurse.rooms.reduce((sum, room) => 
      sum + DIFFICULTY_WEIGHTS[room.difficulty], 0
    );

    // Check for violations
    if (nurse.chemoCount > 1) {
      nurse.warnings.push(`Has ${nurse.chemoCount} chemo patients (max 1 allowed)`);
    }

    if (nurse.isCharge && nurse.rooms.length !== 3) {
      nurse.warnings.push(`Charge nurse should have 3 patients, has ${nurse.rooms.length}`);
    }

    // Check proximity violations
    const nurseProximityScore = calculateProximityScore(nurse.rooms);
    if (nurseProximityScore < nurse.rooms.length) {
      nurse.warnings.push('Rooms are spread across multiple areas');
    }
  });

  // Check for multiple chemo violations
  const multipleChemoNurses = activeNurses.filter(nurse => nurse.chemoCount > 1);
  if (multipleChemoNurses.length > 0) {
    warnings.push(`${multipleChemoNurses.length} nurses have multiple chemo patients`);
  }

  // Check for difficulty balance
  const difficultyScores = activeNurses.map(nurse => nurse.difficultyScore);
  const avgDifficulty = difficultyScores.reduce((sum, score) => sum + score, 0) / difficultyScores.length;
  const maxDeviation = Math.max(...difficultyScores.map(score => Math.abs(score - avgDifficulty)));
  
  if (maxDeviation > 2) {
    warnings.push('Difficulty distribution is unbalanced across nurses');
  }

  return {
    assignments,
    warnings,
    totalRooms: occupiedRooms.length,
    success: warnings.length === 0
  };
}

function assignContinuityRooms(
  rooms: Room[],
  nurses: NurseAssignment[],
  nurseNames: string[]
): void {
  // Find rooms that have previous nurse assignments
  const continuityRooms = rooms.filter(room => 
    room.previousNurse && nurseNames.includes(room.previousNurse)
  );

  continuityRooms.forEach(room => {
    // Find the nurse who had this room previously
    const nurse = nurses.find(n => n.name === room.previousNurse);
    if (nurse && !nurse.isOffCare) {
      nurse.rooms.push(room);
      room.assignedNurse = nurse.name;
      
      // If it's a chemo room, update chemo count
      if (room.isChemo) {
        nurse.chemoCount++;
      }
    }
  });
}

function assignRoomsByContiguousBlocks(
  rooms: Room[], 
  nurses: NurseAssignment[], 
  targetCounts: number[]
): void {
  // Group rooms by contiguous blocks
  const roomsByBlock: { [key: string]: Room[] } = {};
  
  rooms.forEach(room => {
    const blockKey = Object.keys(PROXIMITY_GROUPS).find(key => 
      PROXIMITY_GROUPS[key as keyof typeof PROXIMITY_GROUPS].includes(room.number)
    ) || 'unassigned';
    
    if (!roomsByBlock[blockKey]) {
      roomsByBlock[blockKey] = [];
    }
    roomsByBlock[blockKey].push(room);
  });

  // Sort blocks by total rooms (prioritize larger blocks for better distribution)
  const sortedBlocks = Object.entries(roomsByBlock)
    .sort(([,a], [,b]) => b.length - a.length);

  // Assign entire blocks to nurses when possible
  for (const [blockKey, blockRooms] of sortedBlocks) {
    if (blockRooms.length === 0) continue;

    // Find nurse with most capacity who can take the entire block
    let bestNurse = -1;
    let maxCapacity = -1;
    
    for (let i = 0; i < nurses.length; i++) {
      const capacity = targetCounts[i] - nurses[i].rooms.length;
      if (capacity >= blockRooms.length && capacity > maxCapacity) {
        maxCapacity = capacity;
        bestNurse = i;
      }
    }
    
    if (bestNurse !== -1) {
      // Assign entire block to this nurse
      blockRooms.forEach(room => {
        nurses[bestNurse].rooms.push(room);
        room.assignedNurse = nurses[bestNurse].name;
      });
    } else {
      // Block is too large, split it among nurses with capacity
      // Sort rooms within block by difficulty (hardest first)
      const sortedBlockRooms = blockRooms.sort((a, b) => 
        DIFFICULTY_WEIGHTS[b.difficulty] - DIFFICULTY_WEIGHTS[a.difficulty]
      );
      
      // Distribute rooms within block to nurses with capacity
      for (const room of sortedBlockRooms) {
        // Find nurse with most capacity
        let bestNurse = -1;
        let maxCapacity = -1;
        
        for (let i = 0; i < nurses.length; i++) {
          const capacity = targetCounts[i] - nurses[i].rooms.length;
          if (capacity > 0 && capacity > maxCapacity) {
            maxCapacity = capacity;
            bestNurse = i;
          }
        }
        
        if (bestNurse !== -1) {
          nurses[bestNurse].rooms.push(room);
          room.assignedNurse = nurses[bestNurse].name;
        }
      }
    }
  }
}

function calculateProximityScore(rooms: Room[]): number {
  if (rooms.length <= 1) return rooms.length;
  
  const roomNumbers = rooms.map(r => r.number);
  let proximityScore = 0;
  
  Object.values(PROXIMITY_GROUPS).forEach(group => {
    const roomsInGroup = roomNumbers.filter(num => group.includes(num));
    if (roomsInGroup.length > 1) {
      proximityScore += roomsInGroup.length;
    }
  });
  
  return proximityScore;
}

// Helper function to get available nurse names
export function getDefaultNurseNames(count: number): string[] {
  const names = [
    'Nurse Adams',
    'Nurse Brown', 
    'Nurse Chen',
    'Nurse Davis',
    'Nurse Evans',
    'Nurse Foster',
    'Nurse Garcia'
  ];
  
  return names.slice(0, count);
}

// Helper function to create default room data
export function createDefaultRooms(): Room[] {
  const roomNumbers = [
    '600', '601', '602', '603', '604', '605A', '605B', '606A', '606B', '607', '608', '609',
    '610', '611', '612', '613', '614', '615A', '615B', '616A', '616B', '617A', '617B', '618A', '618B',
    '619', '620', '621', '622', '623'
  ];
  
  return roomNumbers.map((number, index) => ({
    id: `room-${index}`,
    number,
    isOccupied: Math.random() > 0.2, // 80% occupancy by default
    difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)] as 'easy' | 'medium' | 'hard',
    isChemo: Math.random() > 0.8, // 20% chemo rooms
    assignedNurse: undefined,
    previousNurse: undefined
  }));
}