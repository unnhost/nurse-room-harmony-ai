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
import { Users, Settings, Calendar, Play, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
const Index = () => {
  const [nurseCount, setNurseCount] = useState<5 | 6 | 7>(6);
  const [nurseNames, setNurseNames] = useState<string[]>(getDefaultNurseNames(6));
  const [rooms, setRooms] = useState<Room[]>(createDefaultRooms());
  const [assignments, setAssignments] = useState<NurseAssignment[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("setup");
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
    setIsAIGenerating(true);
    try {
      const result = await generateAISchedule({
        nurseCount,
        nurseNames,
        rooms
      });
      setAssignments(result.assignments);
      setWarnings(result.warnings);
      setActiveTab("schedule");
      toast({
        title: result.success ? "AI Schedule Generated!" : "AI Schedule Generated with Warnings",
        description: result.success ? `AI successfully assigned ${result.totalRooms} rooms to ${nurseCount} nurses` : `${result.warnings.length} warnings found in AI assignment`
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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-12 text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground mb-2">Infill 6 assignment </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Intelligent nurse scheduling system for optimal patient care distribution
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 h-14 bg-card border shadow-card">
            <TabsTrigger value="setup" className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-medium transition-all duration-200">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Setup</span>
            </TabsTrigger>
            <TabsTrigger value="previous" className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-medium transition-all duration-200">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Previous Shift</span>
            </TabsTrigger>
            <TabsTrigger value="rooms" className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-medium transition-all duration-200">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Rooms</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-medium transition-all duration-200">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Schedule</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-8">
            <Card className="shadow-card border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-gradient-primary rounded-lg">
                    <Settings className="h-6 w-6 text-white" />
                  </div>
                  Shift Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="nurseCount" className="text-base font-semibold">Number of Nurses</Label>
                  <Select value={nurseCount.toString()} onValueChange={handleNurseCountChange}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 Nurses</SelectItem>
                      <SelectItem value="6">6 Nurses (1 Charge)</SelectItem>
                      <SelectItem value="7">7 Nurses (1 Off-Care)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">Nurse Names</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {nurseNames.map((name, index) => (
                      <Input 
                        key={index} 
                        value={name} 
                        onChange={e => {
                          const newNames = [...nurseNames];
                          newNames[index] = e.target.value;
                          setNurseNames(newNames);
                        }} 
                        placeholder={`Nurse ${index + 1} name`} 
                        className="h-12 text-base"
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-6 pt-4">
                  <div className="p-6 bg-gradient-subtle rounded-xl border border-border/50">
                    <p className="text-center text-muted-foreground">
                      Configure your shift settings and generate optimal nurse assignments
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={generateAssignments} className="flex-1" variant="medical" size="lg">
                      <Play className="h-5 w-5 mr-2" />
                      Generate Schedule
                    </Button>
                    <Button onClick={generateAIAssignments} className="flex-1" variant="outline" size="lg" disabled={isAIGenerating}>
                      <Bot className="h-5 w-5 mr-2" />
                      {isAIGenerating ? "AI Thinking..." : "AI Schedule"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="previous">
            <Card className="shadow-card border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-gradient-accent rounded-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  Previous Shift Assignments
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  Set previous nurse assignments for continuity of care
                </p>
              </CardHeader>
              <CardContent>
                <PreviousShiftInput rooms={rooms} nurseNames={nurseNames} onPreviousNurseChange={handlePreviousNurseChange} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rooms">
            <Card className="shadow-card border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-gradient-accent rounded-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  Room Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RoomGrid rooms={rooms} onRoomClick={() => {}} onDifficultyChange={handleRoomDifficultyChange} onChemoToggle={handleChemoToggle} onOccupancyToggle={handleOccupancyToggle} editMode={true} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            {assignments.length > 0 ? (
              <ScheduleDisplay assignments={assignments} totalRooms={rooms.filter(r => r.isOccupied).length} warnings={warnings} />
            ) : (
              <Card className="shadow-card border-0 bg-card/50 backdrop-blur-sm">
                <CardContent className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-primary rounded-full mb-6 shadow-glow">
                    <Calendar className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">No Schedule Generated</h3>
                  <p className="text-lg text-muted-foreground max-w-md mx-auto">
                    Configure your shift settings and generate optimal nurse assignments.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>;
};
export default Index;