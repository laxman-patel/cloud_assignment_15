import { useEffect, useState } from 'react';
import { Plus, Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { API_URLS } from '../config';

interface Appointment {
    id: string;
    patient_id: string;
    doctor_id: string;
    time: string;
}

export function Appointments() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showBookForm, setShowBookForm] = useState(false);
    const [newBooking, setNewBooking] = useState({ patientId: '', doctorId: '', time: '' });

    const fetchAppointments = async () => {
        try {
            const res = await fetch(`${API_URLS.APPOINTMENT}/appointments`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setAppointments(data);
            }
        } catch (error) {
            console.error('Failed to fetch appointments', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    const handleBookAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URLS.APPOINTMENT}/appointments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBooking),
            });

            if (res.ok) {
                setShowBookForm(false);
                setNewBooking({ patientId: '', doctorId: '', time: '' });
                fetchAppointments(); // Refresh list
            }
        } catch (error) {
            console.error('Failed to book appointment', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Appointments</h2>
                    <p className="text-zinc-400 mt-2">Schedule and view upcoming consultations.</p>
                </div>
                <button
                    onClick={() => setShowBookForm(!showBookForm)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <Plus size={20} />
                    Book Appointment
                </button>
            </div>

            {showBookForm && (
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-semibold mb-4">Book New Appointment</h3>
                    <form onSubmit={handleBookAppointment} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Patient ID</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g., p1"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500"
                                value={newBooking.patientId}
                                onChange={e => setNewBooking({ ...newBooking, patientId: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Doctor ID</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g., d1"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500"
                                value={newBooking.doctorId}
                                onChange={e => setNewBooking({ ...newBooking, doctorId: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Date & Time</label>
                            <input
                                type="datetime-local"
                                required
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500"
                                value={newBooking.time}
                                onChange={e => setNewBooking({ ...newBooking, time: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium">
                                Confirm
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowBookForm(false)}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <p className="text-zinc-500 col-span-full text-center py-8">Loading appointments...</p>
                ) : appointments.length === 0 ? (
                    <p className="text-zinc-500 col-span-full text-center py-8">No upcoming appointments.</p>
                ) : (
                    appointments.map((apt) => (
                        <div key={apt.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl hover:border-zinc-700 transition-colors">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-zinc-200">Patient #{apt.patient_id}</p>
                                        <p className="text-xs text-zinc-500">Doctor #{apt.doctor_id}</p>
                                    </div>
                                </div>
                                <span className="px-2 py-1 text-xs font-medium bg-zinc-800 text-zinc-400 rounded">Confirmed</span>
                            </div>

                            <div className="space-y-2 text-sm text-zinc-400">
                                <div className="flex items-center gap-2">
                                    <CalendarIcon size={14} />
                                    <span>{new Date(apt.time).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={14} />
                                    <span>{new Date(apt.time).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
