'use client';

import { useState, useEffect } from 'react';
import CabinCard from './CabinCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Filter, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Cabin {
    id: string;
    floor: string;
    link: string;
}

interface CabinGridProps {
    selectedDate: Date | undefined;
    startTime?: string;
    endTime?: string;
}

export default function CabinGrid({ selectedDate, startTime, endTime }: CabinGridProps) {
    const [cabins, setCabins] = useState<Cabin[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterFloor, setFilterFloor] = useState<string>('all');
    const [showAvailableOnly, setShowAvailableOnly] = useState<boolean>(true);
    const [loadingCount, setLoadingCount] = useState(0);
    const [statuses, setStatuses] = useState<Record<string, string>>({});

    const handleStatusChange = (id: string, status: string) => {
        setStatuses(prev => {
            if (prev[id] === status) return prev;
            return { ...prev, [id]: status };
        });
    };

    const handleCheckComplete = () => {
        setLoadingCount(prev => Math.max(0, prev - 1));
    };

    useEffect(() => {
        const fetchCabins = async () => {
            try {
                const res = await fetch('/api/cabins');
                if (res.ok) {
                    const data = await res.json();
                    setCabins(data);
                    setLoadingCount(data.length);
                }
            } catch (e) {
                console.error("Failed to fetch cabins", e);
            } finally {
                setLoading(false);
            }
        };
        fetchCabins();
    }, []);

    // Get unique floors for filter
    const floors = Array.from(new Set(cabins.map(c => c.floor))).sort();

    if (loading) {
        return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
            ))}
        </div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end items-center gap-2">
                {loadingCount > 0 && (
                    <Badge variant="secondary" className="animate-pulse mr-2">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Cargando... {loadingCount}
                    </Badge>
                )}
                <Button
                    variant={showAvailableOnly ? "default" : "outline"}
                    onClick={() => setShowAvailableOnly(!showAvailableOnly)}
                    className={showAvailableOnly ? "bg-[#E54E25] hover:bg-[#d64520] text-white" : ""}
                >
                    <Filter className="mr-2 h-4 w-4" />
                    {showAvailableOnly ? "Solo Disponible" : "Todo"}
                </Button>
                <div className="w-[180px]">
                    <Select value={filterFloor} onValueChange={setFilterFloor}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filtrar por planta" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las plantas</SelectItem>
                            {floors.map(f => (
                                <SelectItem key={f} value={f}>Planta {f}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {cabins.map(cabin => {
                    const isFloorMatch = filterFloor === 'all' || cabin.floor === filterFloor;

                    const status = statuses[cabin.id] || 'Loading';
                    // If showAvailableOnly is true, show only 'Available' status (or 'Loading')
                    const isStatusMatch = !showAvailableOnly || status === 'Available' || status === 'Loading';

                    const isVisible = isFloorMatch && isStatusMatch;

                    return (
                        <div key={cabin.id} style={{ display: isVisible ? 'block' : 'none' }}>
                            <CabinCard
                                id={cabin.id}
                                floor={cabin.floor}
                                link={cabin.link}
                                selectedDate={selectedDate}
                                startTime={startTime}
                                endTime={endTime}
                                showAvailableOnly={showAvailableOnly}
                                onCheckComplete={handleCheckComplete}
                                onStatusChange={(status) => handleStatusChange(cabin.id, status)}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Empty state check */}
            {Object.entries(statuses).filter(([id, status]) => {
                const cabin = cabins.find(c => c.id === id);
                if (!cabin) return false;
                const isFloorMatch = filterFloor === 'all' || cabin.floor === filterFloor;
                const isStatusMatch = !showAvailableOnly || status === 'Available' || status === 'Loading';
                return isFloorMatch && isStatusMatch;
            }).length === 0 && loadingCount === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        No se encontraron cabinas disponibles.
                    </div>
                )}
        </div>
    );
}
