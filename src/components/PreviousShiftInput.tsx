import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Room } from "@/components/RoomGrid";

interface PreviousShiftInputProps {
  rooms: Room[];
  nurseNames: string[];
  onPreviousNurseChange: (roomId: string, previousNurse: string) => void;
}

export const PreviousShiftInput = ({ rooms, nurseNames, onPreviousNurseChange }: PreviousShiftInputProps) => {
  // Show all rooms for previous shift input (not just occupied ones)
  const sortedRooms = [...rooms].sort((a, b) => {
    const aNum = parseInt(a.number.replace(/[AB]/g, ''));
    const bNum = parseInt(b.number.replace(/[AB]/g, ''));
    if (aNum === bNum) {
      return a.number.localeCompare(b.number);
    }
    return aNum - bNum;
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select which nurse had each room in the previous shift for continuity of care
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedRooms.map((room) => (
          <Card key={room.id} className={`p-4 ${!room.isOccupied ? 'opacity-60 border-dashed' : ''}`}>
            <div className="space-y-2">
              <Label className="font-semibold">
                Room {room.number} {!room.isOccupied && <span className="text-muted-foreground">(Empty)</span>}
              </Label>
              <Select
                value={room.previousNurse || "none"}
                onValueChange={(value) => onPreviousNurseChange(room.id, value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select previous nurse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No previous nurse</SelectItem>
                  {nurseNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};