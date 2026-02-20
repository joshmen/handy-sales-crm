import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
          <FileQuestion className="w-8 h-8 text-gray-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-gray-300">404</h1>
          <h2 className="text-xl font-semibold text-gray-900">Página no encontrada</h2>
          <p className="text-sm text-gray-500">
            La página que buscas no existe o fue movida.
          </p>
        </div>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Home className="w-4 h-4" />
          Ir al Dashboard
        </a>
      </div>
    </div>
  );
}
