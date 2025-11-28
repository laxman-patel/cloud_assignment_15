import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Activity } from 'lucide-react';
import { API_URLS } from '../config';

interface AppointmentAnalytics {
    metricType: string;
    totalEventsCreated: number;
    avgAppointmentsPerHour: number;
    windowStartTime: number;
    windowEndTime: number;
    timestamp: number;
}

export function Analytics() {
    const [metrics, setMetrics] = useState<AppointmentAnalytics | null>(null);

    // Real-time updates via WebSocket
    useEffect(() => {
        const ws = new WebSocket(API_URLS.WS_APPOINTMENT);

        ws.onopen = () => {
            console.log('Connected to Analytics Stream');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Check if the data matches the expected structure or if it's the raw JSON string
                // The appointment service broadcasts the raw value string from Kafka
                const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

                if (parsedData.metricType === 'AppointmentAnalytics') {
                    setMetrics(parsedData);
                }
            } catch (e) {
                console.error('Failed to parse WS message:', e);
            }
        };

        return () => {
            ws.close();
        };
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Analytics Insights</h2>
                <p className="text-zinc-400 mt-2">Real-time data processing powered by Apache Flink.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-zinc-400">Total Events Created</p>
                        <Activity className="text-emerald-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-zinc-100">
                        {metrics?.totalEventsCreated?.toLocaleString() ?? '0'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">Since system start</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-zinc-400">Avg Appointments / Hour</p>
                        <BarChart3 className="text-blue-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-zinc-100">
                        {metrics?.avgAppointmentsPerHour?.toFixed(1) ?? '0.0'}
                    </p>
                    <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                        <TrendingUp size={12} /> Real-time metric
                    </p>
                </div>
            </div>
        </div>
    );
}
