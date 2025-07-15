import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoomGrid, Room } from "@/components/RoomGrid";
import { PreviousShiftInput } from "@/components/PreviousShiftInput";
import { ScheduleDisplay, NurseAssignment } from "@/components/ScheduleDisplay";
import { generateSchedule, getDefaultNurseNames, createDefaultRooms } from "@/utils/schedulingAlgorithm";
import { generateAISchedule } from "@/utils/aiScheduling";
import { Users, Settings, Calendar, Play, Bot, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
const Index = () => {
  const [nurseCount, setNurseCount] = useState<5 | 6 | 7>(6);
  const [nurseNames, setNurseNames] = useState<string[]>(getDefaultNurseNames(6));
  const [rooms, setRooms] = useState<Room[]>(createDefaultRooms());
  const [assignments, setAssignments] = useState<NurseAssignment[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("setup");
  const [apiKey, setApiKey] = useState<string>("");
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const {
    toast
  } = useToast();
  const handleNurseCountChange = (value: string) => {
    const count = parseInt(value) as 5 | 6 | 7;
    setNurseCount(count);
    setNurseNames(getDefaultNurseNames(count));
  };
  const handleRoomDifficultyChange = (roomId: string, difficulty: 'easy' | 'medium' | 'hard') => {
    setRooms(rooms.map(room => room.id === roomId ? {
      ...room,
      difficulty
    } : room));
  };
  const handleChemoToggle = (roomId: string) => {
    setRooms(rooms.map(room => room.id === roomId ? {
      ...room,
      isChemo: !room.isChemo
    } : room));
  };
  const handleOccupancyToggle = (roomId: string) => {
    setRooms(rooms.map(room => room.id === roomId ? {
      ...room,
      isOccupied: !room.isOccupied
    } : room));
  };
  const handlePreviousNurseChange = (roomId: string, previousNurse: string) => {
    setRooms(rooms.map(room => room.id === roomId ? {
      ...room,
      previousNurse: previousNurse || undefined
    } : room));
  };
  const generateAssignments = () => {
    const result = generateSchedule({
      nurseCount,
      nurseNames,
      rooms
    });
    setAssignments(result.assignments);
    setWarnings(result.warnings);
    setActiveTab("schedule");
    toast({
      title: result.success ? "Schedule Generated!" : "Schedule Generated with Warnings",
      description: result.success ? `Successfully assigned ${result.totalRooms} rooms to ${nurseCount} nurses` : `${result.warnings.length} warnings found in assignment`
    });
  };

  const generateAIAssignments = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your OpenAI API key to use AI scheduling",
        variant: "destructive"
      });
      return;
    }

    setIsAIGenerating(true);
    try {
      const result = await generateAISchedule({
        nurseCount,
        nurseNames,
        rooms,
        apiKey: apiKey.trim()
      });
      
      setAssignments(result.assignments);
      setWarnings(result.warnings);
      setActiveTab("schedule");
      
      toast({
        title: result.success ? "AI Schedule Generated!" : "AI Schedule Generated with Warnings",
        description: result.success 
          ? `AI successfully assigned ${result.totalRooms} rooms to ${nurseCount} nurses` 
          : `${result.warnings.length} warnings found in AI assignment`
      });
    } catch (error) {
      toast({
        title: "AI Scheduling Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsAIGenerating(false);
    }
  };
  return <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto p-6">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">Infill 6 assignment </h1>
          <p className="text-lg text-muted-foreground">
            Intelligent room assignment system for hospital floor management
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="setup" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Setup
            </TabsTrigger>
            <TabsTrigger value="previous" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Previous Shift
            </TabsTrigger>
            <TabsTrigger value="rooms" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Rooms
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Shift Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="nurseCount">Number of Nurses</Label>
                  <Select value={nurseCount.toString()} onValueChange={handleNurseCountChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 Nurses</SelectItem>
                      <SelectItem value="6">6 Nurses (1 Charge)</SelectItem>
                      <SelectItem value="7">7 Nurses (1 Off-Care)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nurse Names</Label>
                  {nurseNames.map((name, index) => <Input key={index} value={name} onChange={e => {
                  const newNames = [...nurseNames];
                  newNames[index] = e.target.value;
                  setNurseNames(newNames);
                }} placeholder={`Nurse ${index + 1} name`} />)}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="apiKey">OpenAI API Key (for AI scheduling)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="apiKey"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="flex-1"
                      />
                      <Button variant="outline" size="icon">
                        <Key className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your API key is stored locally and never sent to our servers
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={generateAssignments} className="flex-1" variant="medical" size="lg">
                      <Play className="h-5 w-5 mr-2" />
                      Generate Schedule
                    </Button>
                    <Button 
                      onClick={generateAIAssignments} 
                      className="flex-1" 
                      variant="outline" 
                      size="lg"
                      disabled={isAIGenerating}
                    >
                      <Bot className="h-5 w-5 mr-2" />
                      {isAIGenerating ? "AI Thinking..." : "AI Schedule"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="previous">
            <Card>
              <CardHeader>
                <CardTitle>Previous Shift Assignments</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Set previous nurse assignments for continuity of care
                </p>
              </CardHeader>
              <CardContent>
                <PreviousShiftInput rooms={rooms} nurseNames={nurseNames} onPreviousNurseChange={handlePreviousNurseChange} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rooms">
            <Card>
              <CardHeader>
                <CardTitle>Room Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <RoomGrid rooms={rooms} onRoomClick={() => {}} onDifficultyChange={handleRoomDifficultyChange} onChemoToggle={handleChemoToggle} onOccupancyToggle={handleOccupancyToggle} editMode={true} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            {assignments.length > 0 ? <ScheduleDisplay assignments={assignments} totalRooms={rooms.filter(r => r.isOccupied).length} warnings={warnings} /> : <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg text-muted-foreground">
                    No schedule generated yet. Configure your shift and generate assignments.
                  </p>
                </CardContent>
              </Card>}
          </TabsContent>
        </Tabs>
      </div>
    </div>;
};
export default Index;