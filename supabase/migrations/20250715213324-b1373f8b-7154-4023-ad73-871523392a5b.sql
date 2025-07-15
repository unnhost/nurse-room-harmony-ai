-- Create tables for schedule persistence

-- Schedules table to store different schedule versions (day/night shift)
CREATE TABLE public.schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('day', 'night')),
  nurse_count INTEGER NOT NULL CHECK (nurse_count >= 5 AND nurse_count <= 7),
  nurse_names TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT false
);

-- Rooms table to store room configurations per schedule
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  is_occupied BOOLEAN NOT NULL DEFAULT false,
  difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_chemo BOOLEAN NOT NULL DEFAULT false,
  assigned_nurse TEXT,
  previous_nurse TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, room_number)
);

-- Nurse assignments table to store final assignments per schedule
CREATE TABLE public.nurse_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  nurse_name TEXT NOT NULL,
  is_charge BOOLEAN NOT NULL DEFAULT false,
  is_off_care BOOLEAN NOT NULL DEFAULT false,
  assigned_rooms TEXT[] NOT NULL DEFAULT '{}',
  chemo_count INTEGER NOT NULL DEFAULT 0,
  difficulty_score NUMERIC NOT NULL DEFAULT 0,
  warnings TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nurse_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is an internal hospital system)
CREATE POLICY "Everyone can view schedules" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Everyone can insert schedules" ON public.schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update schedules" ON public.schedules FOR UPDATE USING (true);
CREATE POLICY "Everyone can delete schedules" ON public.schedules FOR DELETE USING (true);

CREATE POLICY "Everyone can view rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Everyone can insert rooms" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update rooms" ON public.rooms FOR UPDATE USING (true);
CREATE POLICY "Everyone can delete rooms" ON public.rooms FOR DELETE USING (true);

CREATE POLICY "Everyone can view nurse assignments" ON public.nurse_assignments FOR SELECT USING (true);
CREATE POLICY "Everyone can insert nurse assignments" ON public.nurse_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update nurse assignments" ON public.nurse_assignments FOR UPDATE USING (true);
CREATE POLICY "Everyone can delete nurse assignments" ON public.nurse_assignments FOR DELETE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nurse_assignments_updated_at
  BEFORE UPDATE ON public.nurse_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_schedules_shift_type ON public.schedules(shift_type);
CREATE INDEX idx_schedules_is_active ON public.schedules(is_active);
CREATE INDEX idx_rooms_schedule_id ON public.rooms(schedule_id);
CREATE INDEX idx_nurse_assignments_schedule_id ON public.nurse_assignments(schedule_id);