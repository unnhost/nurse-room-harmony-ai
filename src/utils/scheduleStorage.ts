import { supabase } from "@/integrations/supabase/client";
import { Room } from "@/components/RoomGrid";
import { NurseAssignment } from "@/components/ScheduleDisplay";

export interface Schedule {
  id: string;
  name: string;
  shift_type: 'day' | 'night';
  nurse_count: number;
  nurse_names: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduleWithRooms extends Schedule {
  rooms: Room[];
  assignments: NurseAssignment[];
}

export const saveSchedule = async (
  name: string,
  shift_type: 'day' | 'night',
  nurse_count: number,
  nurse_names: string[],
  rooms: Room[],
  assignments: NurseAssignment[]
): Promise<{ success: boolean; error?: string; schedule?: Schedule }> => {
  try {
    // First, deactivate any existing active schedule for this shift type
    await supabase
      .from('schedules')
      .update({ is_active: false })
      .eq('shift_type', shift_type);

    // Insert the new schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .insert({
        name,
        shift_type,
        nurse_count,
        nurse_names,
        is_active: true
      })
      .select()
      .single();

    if (scheduleError) {
      return { success: false, error: scheduleError.message };
    }

    // Insert rooms for this schedule
    const roomsData = rooms.map(room => ({
      schedule_id: schedule.id,
      room_number: room.number,
      is_occupied: room.isOccupied,
      difficulty: room.difficulty,
      is_chemo: room.isChemo,
      assigned_nurse: room.assignedNurse || null,
      previous_nurse: room.previousNurse || null
    }));

    const { error: roomsError } = await supabase
      .from('rooms')
      .insert(roomsData);

    if (roomsError) {
      return { success: false, error: roomsError.message };
    }

    // Insert nurse assignments for this schedule
    const assignmentsData = assignments.map(assignment => ({
      schedule_id: schedule.id,
      nurse_name: assignment.name,
      is_charge: assignment.isCharge,
      is_off_care: assignment.isOffCare,
      assigned_rooms: assignment.rooms.map(r => r.number),
      chemo_count: assignment.chemoCount,
      difficulty_score: assignment.difficultyScore,
      warnings: assignment.warnings
    }));

    const { error: assignmentsError } = await supabase
      .from('nurse_assignments')
      .insert(assignmentsData);

    if (assignmentsError) {
      return { success: false, error: assignmentsError.message };
    }

    return { success: true, schedule: { ...schedule, shift_type: schedule.shift_type as 'day' | 'night' } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const loadSchedule = async (shift_type: 'day' | 'night'): Promise<{ success: boolean; data?: ScheduleWithRooms; error?: string }> => {
  try {
    // Get the active schedule for this shift type
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('*')
      .eq('shift_type', shift_type)
      .eq('is_active', true)
      .single();

    if (scheduleError) {
      if (scheduleError.code === 'PGRST116') {
        return { success: false, error: `No active ${shift_type} shift schedule found` };
      }
      return { success: false, error: scheduleError.message };
    }

    // Get rooms for this schedule
    const { data: roomsData, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .eq('schedule_id', schedule.id);

    if (roomsError) {
      return { success: false, error: roomsError.message };
    }

    // Convert rooms data to Room interface
    const rooms: Room[] = roomsData.map(room => ({
      id: room.room_number,
      number: room.room_number,
      isOccupied: room.is_occupied,
      difficulty: room.difficulty as 'easy' | 'medium' | 'hard',
      isChemo: room.is_chemo,
      assignedNurse: room.assigned_nurse || undefined,
      previousNurse: room.previous_nurse || undefined
    }));

    // Get nurse assignments for this schedule
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('nurse_assignments')
      .select('*')
      .eq('schedule_id', schedule.id);

    if (assignmentsError) {
      return { success: false, error: assignmentsError.message };
    }

    // Convert assignments data to NurseAssignment interface
    const assignments: NurseAssignment[] = assignmentsData.map(assignment => ({
      id: assignment.nurse_name,
      name: assignment.nurse_name,
      rooms: rooms.filter(room => assignment.assigned_rooms.includes(room.number)),
      isCharge: assignment.is_charge,
      isOffCare: assignment.is_off_care,
      chemoCount: assignment.chemo_count,
      difficultyScore: assignment.difficulty_score,
      warnings: assignment.warnings
    }));

    return {
      success: true,
      data: {
        ...schedule,
        shift_type: schedule.shift_type as 'day' | 'night',
        rooms,
        assignments
      }
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const getSchedulesList = async (): Promise<{ success: boolean; data?: Schedule[]; error?: string }> => {
  try {
    const { data: schedules, error } = await supabase
      .from('schedules')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: schedules.map(s => ({ ...s, shift_type: s.shift_type as 'day' | 'night' })) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const deleteSchedule = async (scheduleId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};