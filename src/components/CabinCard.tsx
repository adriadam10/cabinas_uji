'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Loader2 } from 'lucide-react';

interface CabinCardProps {
    id: string;
    floor: string;
    link: string;
    selectedDate?: Date;
    startTime?: string;
    endTime?: string;
    showAvailableOnly: boolean;
    onCheckComplete?: () => void;
    onStatusChange?: (status: string) => void;
}

export default function CabinCard({ id, floor, link, selectedDate, startTime, endTime, showAvailableOnly, onCheckComplete, onStatusChange }: CabinCardProps) {
    const [status, setStatus] = useState<'Loading' | 'Available' | 'Occupied' | 'Closed' | 'Unknown' | 'Partial'>('Loading');
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setChecking(true);
        setStatus('Loading');

        const fetchStatus = async () => {
            try {
                // Determine date string YYYY-MM-DD
                const dateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : '';

                const params = new URLSearchParams({
                    url: link,
                    date: dateStr,
                    ...(startTime && { start: startTime }),
                    ...(endTime && { end: endTime })
                });

                const res = await fetch(`/api/availability?${params.toString()}`);
                if (!res.ok) throw new Error('Failed');
                const data = await res.json();

                if (isMounted) {
                    setStatus(data.status || 'Unknown');
                }
            } catch (e) {
                if (isMounted) setStatus('Unknown');
            } finally {
                if (isMounted) {
                    setChecking(false);
                    onCheckComplete?.();
                }
            }
        };

        fetchStatus();

        return () => { isMounted = false; };
    }, [link, selectedDate, startTime, endTime]);

    // Notify parent of status changes, whenever status changes
    useEffect(() => {
        onStatusChange?.(status);
    }, [status, onStatusChange]);

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'Available': return 'bg-green-500 hover:bg-green-600';
            case 'Occupied': return 'bg-red-500 hover:bg-red-600';
            case 'Closed': return 'bg-gray-500 hover:bg-gray-600';
            case 'Partial': return 'bg-orange-500 hover:bg-orange-600';
            default: return 'bg-yellow-500 hover:bg-yellow-600';
        }
    };

    return (
        <Card className="w-full h-full flex flex-col hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">Cabina {id}</CardTitle>
                    <Badge variant="outline" className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Planta {floor}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-grow pt-4">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Estado</span>
                    {checking ? (
                        <Badge variant="secondary" className="animate-pulse">
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Comprobando...
                        </Badge>
                    ) : (
                        <Badge className={`${getStatusColor(status)} text-white border-0`}>
                            {status}
                        </Badge>
                    )}
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full bg-[#E54E25] hover:bg-[#d64520] text-white" asChild>
                    <a href={link} target="_blank" rel="noopener noreferrer">
                        <Calendar className="mr-2 h-4 w-4" />
                        Reservar Ahora
                    </a>
                </Button>
            </CardFooter>
        </Card>
    );
}
