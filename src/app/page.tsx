'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import CabinGrid from '@/components/CabinGrid';
import { es } from 'date-fns/locale';

export default function Home() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('14:00');

  const now = new Date();
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
  const isToday = date?.toDateString() === now.toDateString();

  const generateTimeSlots = (startHour: number, endHour: number) => {
    const slots = [];
    for (let h = startHour; h <= endHour; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      if (h !== endHour) slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    return slots;
  };

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const getStartTimeOptions = () => {
    const allSlots = generateTimeSlots(8, 20); // 08:00 to 20:30
    if (!isToday) return allSlots;
    return allSlots.filter(slot => timeToMinutes(slot) > currentTotalMinutes);
  };

  const getEndTimeOptions = () => {
    const allSlots = generateTimeSlots(9, 21);
    const startMins = timeToMinutes(startTime);
    return allSlots.filter(slot => timeToMinutes(slot) > startMins);
  };

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    // Validation is handled by effect now
  };

  useEffect(() => {
    const validStartTimes = getStartTimeOptions();
    let currentStart = startTime;

    // 1. Ensure startTime is valid
    if (!validStartTimes.includes(currentStart)) {
      if (validStartTimes.length > 0) {
        currentStart = validStartTimes[0];
        setStartTime(currentStart);
      }
    }

    // 2. Ensure endTime > startTime
    const startMins = timeToMinutes(currentStart);
    const endMins = timeToMinutes(endTime);

    if (endMins <= startMins) {
      const [h, m] = currentStart.split(':').map(Number);
      let newEndH = h;
      let newEndM = m + 30;
      if (newEndM >= 60) {
        newEndH += 1;
        newEndM -= 60;
      }
      const newEnd = `${String(newEndH).padStart(2, '0')}:${String(newEndM).padStart(2, '0')}`;
      setEndTime(newEnd);
    }
  }, [startTime, endTime, date]); // Added date as it affects valid options

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-[#E54E25]">Cabinas Biblioteca UJI</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Reserva tu espacio de estudio de forma rápida y sencilla.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

          {/* Sidebar / Filters */}
          <div className="md:col-span-4 lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Fecha de Reserva</CardTitle>
                <CardDescription>Selecciona el día</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border shadow-sm"
                  locale={es}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Horario (Opcional)</CardTitle>
                <CardDescription>Filtra por hora de inicio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <div className="w-full">
                    <label className="text-sm font-medium mb-1 block">Inicio</label>
                    <select
                      value={startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="w-full p-2 border rounded-md dark:bg-gray-800"
                    >
                      {getStartTimeOptions().map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full">
                    <label className="text-sm font-medium mb-1 block">Fin</label>
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full p-2 border rounded-md dark:bg-gray-800"
                    >
                      {getEndTimeOptions().map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="md:col-span-8 lg:col-span-9">
            <CabinGrid selectedDate={date} startTime={startTime} endTime={endTime} />
          </div>

        </div>
      </div>
    </main>
  );
}
