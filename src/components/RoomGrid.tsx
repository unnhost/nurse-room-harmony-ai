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
}

interface RoomGridProps {
  rooms: Room[];
  onRoomClick: (room: Room) => void;
  onDifficultyChange: (roomId: string, difficulty: 'easy' | 'medium' | 'hard') => void;
  onChemoToggle: (roomId: string) => void;
  onOccupancyToggle: (roomId: string) => void;
  editMode?: boolean;
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
  editMode = false 
}: RoomGridProps) => {
  const getDifficultyIcon = (difficulty: 'easy' | 'medium' | 'hard') => {
    const Icon = difficultyIcons[difficulty];
    return <Icon className="h-3 w-3" />;
  };

  const getProximityGroup = (roomNumber: string) => {
    // Group rooms by proximity for visual organization
    if (['600', '601', '602', '603', '607', '608', '609', '610'].includes(roomNumber)) {
      return 'group-a';
    }
    if (['617AB', '618AB', '619', '620', '621', '623'].includes(roomNumber)) {
      return 'group-b';
    }
    if (['615AB', '616AB'].includes(roomNumber)) {
      return 'group-c';
    }
    return 'group-other';
  };

  return (
    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 p-4">
      {rooms.map((room) => {
        const proximityGroup = getProximityGroup(room.number);
        
        return (
          <Card 
            key={room.id}
            className={cn(
              "relative transition-all duration-200 cursor-pointer hover:shadow-medium",
              "border-2",
              !room.isOccupied && "opacity-50",
              room.assignedNurse && "ring-2 ring-primary ring-offset-2",
              proximityGroup === 'group-a' && "border-blue-200",
              proximityGroup === 'group-b' && "border-green-200",
              proximityGroup === 'group-c' && "border-purple-200"
            )}
            onClick={() => onRoomClick(room)}
          >
            <CardContent className="p-3 space-y-2">
              {/* Room Number */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{room.number}</span>
                {room.isChemo && (
                  <Stethoscope className="h-4 w-4 text-chemo" />
                )}
              </div>

              {/* Difficulty Badge */}
              <Badge 
                className={cn(
                  "text-xs px-2 py-1 flex items-center gap-1",
                  difficultyColors[room.difficulty]
                )}
              >
                {getDifficultyIcon(room.difficulty)}
                {room.difficulty}
              </Badge>

              {/* Assigned Nurse */}
              {room.assignedNurse && (
                <div className="text-xs text-muted-foreground truncate">
                  {room.assignedNurse}
                </div>
              )}

              {/* Edit Controls */}
              {editMode && (
                <div className="flex gap-1 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOccupancyToggle(room.id);
                    }}
                  >
                    {room.isOccupied ? 'Occupied' : 'Empty'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
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