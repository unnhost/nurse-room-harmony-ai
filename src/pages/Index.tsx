import { useState, useEffect } from "react";
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
import { saveSchedule, loadSchedule, getSchedulesList, deleteSchedule } from "@/utils/scheduleStorage";
import { Users, Settings, Calendar, Play, Bot, Save, Upload, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
const Index = () => {
  const [nurseCount, setNurseCount] = useState<5 | 6 | 7>(6);
  const [nurseNames, setNurseNames] = useState<string[]>(getDefaultNurseNames(6));
  const [rooms, setRooms] = useState<Room[]>(createDefaultRooms());
  const [assignments, setAssignments] = useState<NurseAssignment[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("setup");
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [currentShift, setCurrentShift] = useState<'day' | 'night'>('day');
  const [scheduleName, setScheduleName] = useState('');
  const [savedSchedules, setSavedSchedules] = useState<any[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
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

  // Load saved schedules on component mount
  useEffect(() => {
    loadSchedulesList();
  }, []);

  const loadSchedulesList = async () => {
    setIsLoadingSchedules(true);
    const result = await getSchedulesList();
    if (result.success) {
      setSavedSchedules(result.data || []);
    }
    setIsLoadingSchedules(false);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleName.trim()) {
      toast({
        title: "Schedule Name Required",
        description: "Please enter a name for your schedule",
        variant: "destructive"
      });
      return;
    }

    if (assignments.length === 0) {
      toast({
        title: "No Schedule to Save",
        description: "Please generate a schedule first",
        variant: "destructive"
      });
      return;
    }

    const result = await saveSchedule(
      scheduleName,
      currentShift,
      nurseCount,
      nurseNames,
      rooms,
      assignments
    );

    if (result.success) {
      toast({
        title: "Schedule Saved!",
        description: `${currentShift.charAt(0).toUpperCase() + currentShift.slice(1)} shift schedule saved successfully`
      });
      setScheduleName('');
      loadSchedulesList();
    } else {
      toast({
        title: "Save Failed",
        description: result.error || "Failed to save schedule",
        variant: "destructive"
      });
    }
  };

  const handleLoadSchedule = async (shiftType: 'day' | 'night') => {
    const result = await loadSchedule(shiftType);
    
    if (result.success && result.data) {
      const schedule = result.data;
      setNurseCount(schedule.nurse_count as 5 | 6 | 7);
      setNurseNames(schedule.nurse_names);
      setRooms(schedule.rooms);
      setAssignments(schedule.assignments);
      setWarnings([]);
      setCurrentShift(shiftType);
      setActiveTab("schedule");
      
      toast({
        title: "Schedule Loaded!",
        description: `${shiftType.charAt(0).toUpperCase() + shiftType.slice(1)} shift schedule loaded successfully`
      });
    } else {
      toast({
        title: "Load Failed",
        description: result.error || "Failed to load schedule",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    const result = await deleteSchedule(scheduleId);
    
    if (result.success) {
      toast({
        title: "Schedule Deleted",
        description: "Schedule deleted successfully"
      });
      loadSchedulesList();
    } else {
      toast({
        title: "Delete Failed",
        description: result.error || "Failed to delete schedule",
        variant: "destructive"
      });
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="shiftType" className="text-base font-semibold">Shift Type</Label>
                    <Select value={currentShift} onValueChange={(value: 'day' | 'night') => setCurrentShift(value)}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day Shift</SelectItem>
                        <SelectItem value="night">Night Shift</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">Quick Actions</h3>
                        <p className="text-sm text-muted-foreground">
                          Load existing schedules or generate new ones
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleLoadSchedule('day')} variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Load Day
                        </Button>
                        <Button onClick={() => handleLoadSchedule('night')} variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Load Night
                        </Button>
                      </div>
                    </div>
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
              <div className="space-y-6">
                <Card className="shadow-card border-0 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-gradient-primary rounded-lg">
                        <Save className="h-5 w-5 text-white" />
                      </div>
                      Save Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <Input
                          placeholder={`Enter name for ${currentShift} shift schedule`}
                          value={scheduleName}
                          onChange={(e) => setScheduleName(e.target.value)}
                          className="h-12"
                        />
                      </div>
                      <Button onClick={handleSaveSchedule} variant="success" size="lg" className="min-w-[120px]">
                        <Save className="h-5 w-5 mr-2" />
                        Save {currentShift.charAt(0).toUpperCase() + currentShift.slice(1)}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <ScheduleDisplay assignments={assignments} totalRooms={rooms.filter(r => r.isOccupied).length} warnings={warnings} />
              </div>
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