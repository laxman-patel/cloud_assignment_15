import { PatientList } from './components/PatientList'
import { BookAppointment } from './components/BookAppointment'

function App() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 p-8 font-sans">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-white">Healthcare Portal</h1>
        <p className="text-zinc-400 mt-2">Manage patients and appointments.</p>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        <PatientList />
        <BookAppointment />
      </main>
    </div>
  )
}

export default App
