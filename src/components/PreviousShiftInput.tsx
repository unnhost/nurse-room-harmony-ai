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
  const occupiedRooms = rooms.filter(room => room.isOccupied);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select which nurse had each room in the previous shift for continuity of care
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {occupiedRooms.map((room) => (
          <Card key={room.id} className="p-4">
            <div className="space-y-2">
              <Label className="font-semibold">Room {room.number}</Label>
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