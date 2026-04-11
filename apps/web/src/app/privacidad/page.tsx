import { Metadata } from 'next';
import Link from 'next/link';
import { LandingNav } from '@/components/landing/LandingNav';

export const metadata: Metadata = {
  title: 'Aviso de Privacidad — Handy Suites®',
  description: 'Aviso de Privacidad de Handy Suites conforme a la LFPDPPP. Conoce cómo protegemos tus datos personales.',
};

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-surface-2">
      <LandingNav />

      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">Aviso de Privacidad</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última actualización: febrero 2026</p>

        <div className="mt-8 space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Responsable del tratamiento</h2>
            <p className="mt-2">
              Handy Suites® (en adelante &quot;el Responsable&quot;), con domicilio en Guadalajara, Jalisco, México,
              es responsable del tratamiento de los datos personales que nos proporcione, los cuales serán protegidos
              conforme a lo dispuesto por la Ley Federal de Protección de Datos Personales en Posesión de los
              Particulares (LFPDPPP), su Reglamento y los Lineamientos del Aviso de Privacidad.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Datos personales recabados</h2>
            <p className="mt-2">Para las finalidades señaladas, recabamos las siguientes categorías de datos:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Datos de identificación: nombre completo, correo electrónico, teléfono.</li>
              <li>Datos de la empresa: razón social, RFC, domicilio fiscal, régimen fiscal.</li>
              <li>Datos de acceso: credenciales de autenticación (contraseñas cifradas), tokens de sesión.</li>
              <li>Datos de uso: registros de actividad, direcciones IP, tipo de navegador, geolocalización aproximada.</li>
              <li>Datos financieros: información de facturación y método de pago (procesados por terceros certificados).</li>
            </ul>
            <p className="mt-2">
              No recabamos datos personales sensibles. En caso de ser necesario en el futuro, se solicitará su
              consentimiento expreso y por escrito.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Finalidades del tratamiento</h2>
            <p className="mt-2"><strong>Finalidades primarias (necesarias):</strong></p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Crear y administrar su cuenta de usuario.</li>
              <li>Proveer los servicios contratados (CRM, inventario, facturación, rutas).</li>
              <li>Procesar pagos y emitir facturas electrónicas (CFDI).</li>
              <li>Brindar soporte técnico y atención al cliente.</li>
              <li>Cumplir con obligaciones legales y fiscales (SAT).</li>
            </ul>
            <p className="mt-4"><strong>Finalidades secundarias (opcionales):</strong></p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Enviar comunicaciones comerciales, promociones y novedades del servicio.</li>
              <li>Realizar encuestas de satisfacción y estudios de mercado.</li>
              <li>Mejorar nuestros productos y servicios mediante análisis estadístico anonimizado.</li>
            </ul>
            <p className="mt-2">
              Si no desea que sus datos sean tratados para las finalidades secundarias, puede enviarnos
              un correo a <a href="mailto:privacidad@handysuites.com" className="text-blue-600 hover:underline">privacidad@handysuites.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Transferencias de datos</h2>
            <p className="mt-2">
              Sus datos personales pueden ser transferidos y tratados dentro y fuera del país, por las siguientes
              personas y para los siguientes fines:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Proveedores de infraestructura en la nube (hosting, base de datos) para la prestación del servicio.</li>
              <li>Proveedores de servicios de pago para procesamiento de transacciones.</li>
              <li>PAC (Proveedor Autorizado de Certificación) para timbrado de facturas electrónicas ante el SAT.</li>
              <li>Autoridades competentes cuando sea requerido por ley.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Derechos ARCO</h2>
            <p className="mt-2">
              Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos personales
              (derechos ARCO). Para ejercer cualquiera de estos derechos, envíe su solicitud a{' '}
              <a href="mailto:privacidad@handysuites.com" className="text-blue-600 hover:underline">privacidad@handysuites.com</a>{' '}
              con la siguiente información:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Nombre completo y correo electrónico registrado.</li>
              <li>Descripción clara de los datos sobre los que desea ejercer sus derechos.</li>
              <li>Identificación oficial vigente (copia simple).</li>
            </ul>
            <p className="mt-2">
              Responderemos su solicitud en un plazo máximo de 20 días hábiles conforme a la LFPDPPP.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Revocación del consentimiento y portabilidad</h2>
            <p className="mt-2">
              Usted puede revocar su consentimiento para el tratamiento de sus datos personales en cualquier
              momento, sin efectos retroactivos, enviando su solicitud a{' '}
              <a href="mailto:privacidad@handysuites.com" className="text-blue-600 hover:underline">privacidad@handysuites.com</a>.
              Tenga en cuenta que la revocación del consentimiento para finalidades primarias podría
              implicar la imposibilidad de continuar prestando el servicio.
            </p>
            <p className="mt-2">
              Asimismo, tiene derecho a solicitar la portabilidad de sus datos personales en un formato
              estructurado y de uso común. Los datos de su negocio (clientes, productos, pedidos, facturas)
              pueden exportarse en cualquier momento desde la configuración de su cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Uso de cookies y tecnologías de rastreo</h2>
            <p className="mt-2">
              Utilizamos cookies y tecnologías similares para mejorar su experiencia de navegación, recordar sus
              preferencias y analizar el uso de nuestro sitio. Las cookies que utilizamos son:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li><strong>Esenciales:</strong> necesarias para el funcionamiento del sistema (autenticación, sesión).</li>
              <li><strong>Analíticas:</strong> nos ayudan a entender cómo se utiliza el servicio (datos anonimizados).</li>
            </ul>
            <p className="mt-2">
              Puede configurar su navegador para rechazar cookies, aunque esto podría afectar la funcionalidad del servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Cambios al aviso de privacidad</h2>
            <p className="mt-2">
              Nos reservamos el derecho de modificar este aviso de privacidad. Cualquier cambio será notificado
              a través de nuestra plataforma o por correo electrónico. Le recomendamos revisar periódicamente
              este documento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. Contacto</h2>
            <p className="mt-2">
              Para cualquier duda o aclaración sobre este aviso de privacidad, puede contactarnos en:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Correo: <a href="mailto:privacidad@handysuites.com" className="text-blue-600 hover:underline">privacidad@handysuites.com</a></li>
              <li>Sitio web: <a href="https://handysuites.com" className="text-blue-600 hover:underline">handysuites.com</a></li>
            </ul>
          </section>
        </div>

        <div className="mt-12 border-t border-border-subtle pt-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Handy Suites® — Todos los derechos reservados</p>
          <div className="mt-2 flex justify-center gap-4">
            <Link href="/terminos" className="text-blue-600 hover:underline">Términos de uso</Link>
            <Link href="/" className="text-blue-600 hover:underline">Inicio</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
