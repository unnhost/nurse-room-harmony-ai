import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Room } from "./RoomGrid";
import { UserCog, UserX, Users, AlertTriangle, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NurseAssignment {
  id: string;
  name: string;
  rooms: Room[];
  isCharge: boolean;
  isOffCare: boolean;
  chemoCount: number;
  difficultyScore: number;
  warnings: string[];
}

interface ScheduleDisplayProps {
  assignments: NurseAssignment[];
  totalRooms: number;
  warnings: string[];
}

export const ScheduleDisplay = ({ assignments, totalRooms, warnings }: ScheduleDisplayProps) => {
  const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
    const colors = {
      easy: 'bg-easy text-easy-foreground',
      medium: 'bg-medium text-medium-foreground',
      hard: 'bg-hard text-hard-foreground'
    };
    return colors[difficulty];
  };

  const getNurseTypeIcon = (nurse: NurseAssignment) => {
    if (nurse.isCharge) return <UserCog className="h-4 w-4 text-primary" />;
    if (nurse.isOffCare) return <UserX className="h-4 w-4 text-muted-foreground" />;
    return <Users className="h-4 w-4 text-foreground" />;
  };

  const getNurseTypeLabel = (nurse: NurseAssignment) => {
    if (nurse.isCharge) return "Charge Nurse";
    if (nurse.isOffCare) return "Off-Care";
    return "Staff Nurse";
  };

  const calculateProximityScore = (rooms: Room[]) => {
    // Simple proximity scoring based on room groupings
    const roomNumbers = rooms.map(r => r.number);
    const groups = {
      'group-a': ['600', '601', '602', '603', '607', '608', '609', '610'],
      'group-b': ['617AB', '618AB', '619', '620', '621', '623'],
      'group-c': ['615AB', '616AB'],
      'group-other': ['604', '605AB', '606AB', '611', '612', '613', '614', '615', '616', '622']
    };
    
    let proximityScore = 0;
    Object.values(groups).forEach(group => {
      const roomsInGroup = roomNumbers.filter(num => group.includes(num));
      if (roomsInGroup.length > 1) {
        proximityScore += roomsInGroup.length * 2; // Bonus for keeping rooms together
      }
    });
    
    return proximityScore;
  };

  return (
    <div className="space-y-8">
      {/* Global Warnings */}
      {warnings.length > 0 && (
        <Alert className="border-destructive bg-destructive/5 shadow-card">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription>
            <div className="font-semibold mb-3 text-base">Assignment Warnings:</div>
            <ul className="list-disc list-inside space-y-2">
              {warnings.map((warning, index) => (
                <li key={index} className="text-sm leading-relaxed">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-card border-0 bg-gradient-primary text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm font-medium opacity-90">Total Nurses</div>
                <div className="text-3xl font-bold">{assignments.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0 bg-gradient-accent text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <div className="h-6 w-6 rounded bg-white/50"></div>
              </div>
              <div>
                <div className="text-sm font-medium opacity-90">Total Rooms</div>
                <div className="text-3xl font-bold">{totalRooms}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chemo/20 rounded-lg">
                <Stethoscope className="h-6 w-6 text-chemo" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Chemo Patients</div>
                <div className="text-3xl font-bold text-chemo">
                  {assignments.reduce((sum, nurse) => sum + nurse.chemoCount, 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/20 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Warnings</div>
                <div className="text-3xl font-bold text-warning">{warnings.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nurse Assignments */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignments.map((nurse) => (
          <Card 
            key={nurse.id}
            className={cn(
              "relative transition-all duration-300 hover:shadow-strong shadow-card bg-card/80 backdrop-blur-sm",
              nurse.isCharge && "ring-2 ring-primary ring-offset-2 bg-gradient-to-br from-primary/5 to-primary/10",
              nurse.isOffCare && "opacity-75 grayscale",
              nurse.warnings.length > 0 && "border-destructive bg-destructive/5"
            )}
          >
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className={cn(
                  "p-2 rounded-lg",
                  nurse.isCharge ? "bg-primary/20" : nurse.isOffCare ? "bg-muted" : "bg-accent/20"
                )}>
                  {getNurseTypeIcon(nurse)}
                </div>
                <div>
                  <div className="font-bold">{nurse.name}</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    {getNurseTypeLabel(nurse)}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Room Count and Stats */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rooms:</span>
                <span className="font-semibold">{nurse.rooms.length}</span>
              </div>

              {nurse.chemoCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Chemo:</span>
                  <Badge className="bg-chemo text-chemo-foreground">
                    {nurse.chemoCount}
                  </Badge>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Difficulty:</span>
                <span className="font-semibold">{nurse.difficultyScore.toFixed(1)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Proximity:</span>
                <span className="font-semibold">{calculateProximityScore(nurse.rooms)}</span>
              </div>

              {/* Room List */}
              {nurse.rooms.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Assigned Rooms:</div>
                  <div className="flex flex-wrap gap-1">
                    {nurse.rooms.map((room) => (
                      <Badge 
                        key={room.id} 
                        variant="outline"
                        className={cn(
                          "text-xs px-2 py-1 flex items-center gap-1",
                          room.isChemo && "border-chemo text-chemo"
                        )}
                      >
                        {room.number}
                        {room.isChemo && <Stethoscope className="h-3 w-3" />}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Difficulty Breakdown */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Difficulty Breakdown:</div>
                <div className="flex gap-1">
                  {['easy', 'medium', 'hard'].map((difficulty) => {
                    const count = nurse.rooms.filter(r => r.difficulty === difficulty).length;
                    if (count === 0) return null;
                    return (
                      <Badge 
                        key={difficulty}
                        className={cn(
                          "text-xs px-2 py-1",
                          getDifficultyColor(difficulty as 'easy' | 'medium' | 'hard')
                        )}
                      >
                        {difficulty}: {count}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Nurse-specific Warnings */}
              {nurse.warnings.length > 0 && (
                <Alert className="border-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {nurse.warnings.map((warning, index) => (
                        <li key={index} className="text-xs">{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};