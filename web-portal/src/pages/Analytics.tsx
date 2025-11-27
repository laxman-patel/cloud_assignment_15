import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Activity, Users } from 'lucide-react';

export function Analytics() {
    const [metrics, setMetrics] = useState({
        appointmentsPerHour: 12,
        avgWaitTime: 15,
        patientSatisfaction: 4.8,
        totalProcessed: 1250
    });

    // Simulate real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            setMetrics(prev => ({
                appointmentsPerHour: Math.max(5, prev.appointmentsPerHour + (Math.random() > 0.5 ? 1 : -1)),
                avgWaitTime: Math.max(10, prev.avgWaitTime + (Math.random() > 0.5 ? 0.5 : -0.5)),
                patientSatisfaction: 4.8,
                totalProcessed: prev.totalProcessed + Math.floor(Math.random() * 3)
            }));
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Analytics Insights</h2>
                <p className="text-zinc-400 mt-2">Real-time data processing powered by Apache Flink.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-zinc-400">Appointments / Hour</p>
                        <BarChart3 className="text-blue-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-zinc-100">{metrics.appointmentsPerHour}</p>
                    <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                        <TrendingUp size={12} /> +12% from last hour
                    </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-zinc-400">Avg Wait Time</p>
                        <ClockIcon className="text-orange-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-zinc-100">{metrics.avgWaitTime.toFixed(1)}m</p>
                    <p className="text-xs text-zinc-500 mt-1">Target: &lt; 20m</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-zinc-400">Patient Satisfaction</p>
                        <Users className="text-violet-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-zinc-100">{metrics.patientSatisfaction}/5.0</p>
                    <p className="text-xs text-emerald-500 mt-1">Top 5% of clinics</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-zinc-400">Total Events Processed</p>
                        <Activity className="text-emerald-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-zinc-100">{metrics.totalProcessed.toLocaleString()}</p>
                    <p className="text-xs text-zinc-500 mt-1">Since system start</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-80 flex flex-col justify-center items-center text-zinc-500">
                    <Activity size={48} className="mb-4 opacity-20" />
                    <p>Real-time Appointment Velocity Chart</p>
                    <p className="text-xs mt-2">(Visualization Placeholder)</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-80 flex flex-col justify-center items-center text-zinc-500">
                    <BarChart3 size={48} className="mb-4 opacity-20" />
                    <p>Revenue Distribution by Department</p>
                    <p className="text-xs mt-2">(Visualization Placeholder)</p>
                </div>
            </div>
        </div>
    );
}

function ClockIcon({ className, size }: { className?: string, size?: number }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}
