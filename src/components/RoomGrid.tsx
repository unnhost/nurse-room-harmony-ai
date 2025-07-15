import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stethoscope, AlertTriangle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Room {
  id: string;
  number: string;
  isOccupied: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  isChemo: boolean;
  assignedNurse?: string;
  previousNurse?: string; // For continuity of care
}

interface RoomGridProps {
  rooms: Room[];
  onRoomClick: (room: Room) => void;
  onDifficultyChange: (roomId: string, difficulty: 'easy' | 'medium' | 'hard') => void;
  onChemoToggle: (roomId: string) => void;
  onOccupancyToggle: (roomId: string) => void;
  onPreviousNurseChange?: (roomId: string, previousNurse: string) => void;
  editMode?: boolean;
  showPreviousAssignments?: boolean;
}

const difficultyColors = {
  easy: 'bg-easy text-easy-foreground',
  medium: 'bg-medium text-medium-foreground',
  hard: 'bg-hard text-hard-foreground'
};

const difficultyIcons = {
  easy: Circle,
  medium: AlertTriangle,
  hard: AlertTriangle
};

export const RoomGrid = ({ 
  rooms, 
  onRoomClick, 
  onDifficultyChange, 
  onChemoToggle, 
  onOccupancyToggle,
  onPreviousNurseChange,
  editMode = false,
  showPreviousAssignments = false
}: RoomGridProps) => {
  const getDifficultyIcon = (difficulty: 'easy' | 'medium' | 'hard') => {
    const Icon = difficultyIcons[difficulty];
    return <Icon className="h-3 w-3" />;
  };

  const getProximityGroup = (roomNumber: string) => {
    // Group rooms by proximity for visual organization (matches contiguous blocks)
    if (['600', '601', '602', '603'].includes(roomNumber)) {
      return 'group-a';
    }
    if (['604', '605A', '605B', '606A', '606B'].includes(roomNumber)) {
      return 'group-b';
    }
    if (['607', '608', '609', '610'].includes(roomNumber)) {
      return 'group-a';
    }
    if (['611', '612', '613', '614'].includes(roomNumber)) {
      return 'group-c';
    }
    if (['615A', '615B', '616A', '616B'].includes(roomNumber)) {
      return 'group-c';
    }
    if (['617A', '617B', '618A', '618B'].includes(roomNumber)) {
      return 'group-b';
    }
    if (['619', '620', '621'].includes(roomNumber)) {
      return 'group-b';
    }
    if (['622', '623'].includes(roomNumber)) {
      return 'group-c';
    }
    return 'group-other';
  };

  return (
    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 p-6">
      {rooms.map((room) => {
        const proximityGroup = getProximityGroup(room.number);
        
        return (
          <Card 
            key={room.id}
            className={cn(
              "relative transition-all duration-300 cursor-pointer hover:shadow-strong hover:scale-105",
              "border-2 shadow-card bg-card/80 backdrop-blur-sm",
              !room.isOccupied && "opacity-50 grayscale",
              room.assignedNurse && "ring-2 ring-primary ring-offset-2 shadow-glow",
              proximityGroup === 'group-a' && "border-[hsl(var(--proximity-group-a))] hover:border-[hsl(var(--proximity-group-a))]",
              proximityGroup === 'group-b' && "border-[hsl(var(--proximity-group-b))] hover:border-[hsl(var(--proximity-group-b))]",
              proximityGroup === 'group-c' && "border-[hsl(var(--proximity-group-c))] hover:border-[hsl(var(--proximity-group-c))]",
              proximityGroup === 'group-other' && "border-[hsl(var(--proximity-group-other))] hover:border-[hsl(var(--proximity-group-other))]"
            )}
            onClick={() => onRoomClick(room)}
          >
            <CardContent className="p-4 space-y-3">
              {/* Room Number */}
              <div className="flex items-center justify-between">
                <span className="font-bold text-base">{room.number}</span>
                {room.isChemo && (
                  <div className="p-1 bg-chemo/20 rounded-full">
                    <Stethoscope className="h-4 w-4 text-chemo" />
                  </div>
                )}
              </div>

              {/* Difficulty Badge */}
              <Badge 
                className={cn(
                  "text-xs px-2 py-1 flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity",
                  difficultyColors[room.difficulty]
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  const nextDifficulty = room.difficulty === 'easy' ? 'medium' : 
                                       room.difficulty === 'medium' ? 'hard' : 'easy';
                  onDifficultyChange(room.id, nextDifficulty);
                }}
              >
                {getDifficultyIcon(room.difficulty)}
                {room.difficulty}
              </Badge>

              {/* Assigned Nurse */}
              {room.assignedNurse && (
                <div className="text-xs text-muted-foreground truncate bg-primary/10 px-2 py-1 rounded">
                  Current: {room.assignedNurse}
                </div>
              )}

              {/* Previous Nurse (for continuity) */}
              {showPreviousAssignments && room.previousNurse && (
                <div className="text-xs text-accent-foreground truncate bg-accent/10 px-2 py-1 rounded">
                  Previous: {room.previousNurse}
                </div>
              )}

              {/* Edit Controls */}
              {editMode && (
                <div className="flex flex-col gap-2 mt-2">
                  <Button
                    variant={room.isOccupied ? "success" : "outline"}
                    size="sm"
                    className="text-xs px-2 py-1 w-full h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOccupancyToggle(room.id);
                    }}
                  >
                    {room.isOccupied ? 'Occupied' : 'Empty'}
                  </Button>
                  <Button
                    variant={room.isChemo ? "outline" : "ghost"}
                    size="sm"
                    className={cn(
                      "text-xs px-2 py-1 w-full h-8",
                      room.isChemo && "border-chemo text-chemo hover:bg-chemo/10"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChemoToggle(room.id);
                    }}
                  >
                    {room.isChemo ? 'Chemo' : 'Regular'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};