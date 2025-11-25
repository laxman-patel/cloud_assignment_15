import React, { useState } from 'react';

export const BookAppointment: React.FC = () => {
    const [patientId, setPatientId] = useState('');
    const [doctorId, setDoctorId] = useState('');
    const [time, setTime] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:3002/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientId, doctorId, time }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage(`Appointment booked! ID: ${data.id}`);
            } else {
                setMessage(`Error: ${data.error}`);
            }
        } catch (err) {
            console.error(err);
            setMessage('Failed to book appointment.');
        }
    };

    return (
        <div className="bg-zinc-900 p-6 rounded-lg shadow-lg border border-zinc-800">
            <h2 className="text-2xl font-bold mb-4 text-zinc-100">Book Appointment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-400">Patient ID</label>
                    <input
                        type="text"
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        className="mt-1 block w-full bg-zinc-800 border-zinc-700 rounded-md text-zinc-100 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400">Doctor ID</label>
                    <input
                        type="text"
                        value={doctorId}
                        onChange={(e) => setDoctorId(e.target.value)}
                        className="mt-1 block w-full bg-zinc-800 border-zinc-700 rounded-md text-zinc-100 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400">Time</label>
                    <input
                        type="datetime-local"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="mt-1 block w-full bg-zinc-800 border-zinc-700 rounded-md text-zinc-100 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Book
                </button>
            </form>
            {message && <p className="mt-4 text-sm text-zinc-300">{message}</p>}
        </div>
    );
};
