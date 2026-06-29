import { ChatWidget } from '@/components/ChatWidget';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-8 text-center">
      <h1 className="text-2xl font-bold text-slate-800">Pagina de prueba del widget</h1>
      <p className="mt-2 max-w-md text-slate-500">
        El widget de chat aparece abajo a la derecha. Habla con el backend del chatbot
        (NEXT_PUBLIC_CHATBOT_URL). La logica del bot llega en Fase 1.
      </p>
      <ChatWidget />
    </main>
  );
}
