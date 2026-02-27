import { Metadata } from 'next';
import Link from 'next/link';
import { LandingNav } from '@/components/landing/LandingNav';

export const metadata: Metadata = {
  title: 'Términos de Servicio — Handy Suites®',
  description: 'Términos y condiciones de uso de Handy Suites. Conoce tus derechos y obligaciones como usuario de la plataforma.',
};

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-white">
      <LandingNav />

      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">Términos de Servicio</h1>
        <p className="mt-2 text-sm text-gray-500">Última actualización: febrero 2026</p>

        <div className="mt-8 space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Objeto</h2>
            <p className="mt-2">
              Los presentes Términos de Servicio regulan el acceso y uso de la plataforma Handy Suites®
              (en adelante &quot;la Plataforma&quot;), un sistema de gestión empresarial (ERP/CRM) ofrecido
              como servicio en la nube (SaaS) para pequeñas y medianas empresas en México.
            </p>
            <p className="mt-2">
              Al crear una cuenta o utilizar la Plataforma, usted acepta estos términos en su totalidad.
              Si no está de acuerdo, no utilice el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Definiciones</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li><strong>Usuario:</strong> toda persona que accede a la Plataforma con credenciales válidas.</li>
              <li><strong>Empresa/Tenant:</strong> la organización que contrata el servicio y crea cuentas para sus usuarios.</li>
              <li><strong>Administrador:</strong> usuario con permisos de gestión dentro de su empresa.</li>
              <li><strong>Plan:</strong> nivel de suscripción que determina funcionalidades y límites de uso.</li>
              <li><strong>Datos del Cliente:</strong> toda información ingresada por la empresa y sus usuarios en la Plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Cuentas de usuario</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Cada usuario es responsable de mantener la confidencialidad de sus credenciales de acceso.</li>
              <li>Las cuentas son personales e intransferibles.</li>
              <li>El Administrador es responsable de gestionar los usuarios de su empresa.</li>
              <li>
                Nos reservamos el derecho de suspender o cancelar cuentas que violen estos términos o
                representen un riesgo de seguridad.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Planes y pagos</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>La Plataforma ofrece diferentes planes de suscripción con distintos niveles de funcionalidad.</li>
              <li>Los precios están expresados en Pesos Mexicanos (MXN) e incluyen IVA.</li>
              <li>Los pagos se procesan a través de proveedores de pago certificados.</li>
              <li>La factura electrónica (CFDI) se emite automáticamente por cada pago recibido.</li>
              <li>
                Los límites del plan (usuarios, productos, clientes) se aplican de forma automática.
                Al alcanzar un límite, se notificará para considerar una actualización de plan.
              </li>
              <li>
                El incumplimiento en el pago podrá resultar en la suspensión temporal del servicio
                tras un periodo de gracia de 7 días.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Uso aceptable</h2>
            <p className="mt-2">El usuario se compromete a:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Utilizar la Plataforma exclusivamente para fines lícitos y comerciales legítimos.</li>
              <li>No intentar acceder a datos de otras empresas o usuarios.</li>
              <li>No realizar ingeniería inversa, descompilación o modificación del software.</li>
              <li>No utilizar la Plataforma para almacenar o transmitir contenido ilícito, ofensivo o que viole derechos de terceros.</li>
              <li>No sobrecargar intencionalmente los servidores o infraestructura del servicio.</li>
              <li>Cumplir con las leyes aplicables, incluyendo regulaciones fiscales y de protección de datos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Propiedad intelectual</h2>
            <p className="mt-2">
              La Plataforma, incluyendo su código fuente, diseño, marca, logotipos y documentación,
              es propiedad exclusiva de Handy Suites® y está protegida por las leyes de propiedad
              intelectual de México y tratados internacionales.
            </p>
            <p className="mt-2">
              Los Datos del Cliente son propiedad exclusiva de la empresa que los genera. Handy Suites®
              no reclama propiedad sobre dichos datos y los trata conforme al{' '}
              <Link href="/privacidad" className="text-blue-600 hover:underline">Aviso de Privacidad</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Limitación de responsabilidad</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                La Plataforma se ofrece &quot;tal cual&quot; (&quot;as is&quot;). Si bien nos esforzamos por mantener
                una disponibilidad del 99.5%, no garantizamos que el servicio sea ininterrumpido o libre de errores.
              </li>
              <li>
                Handy Suites® no será responsable por daños indirectos, incidentales, especiales o consecuentes
                derivados del uso o imposibilidad de uso de la Plataforma.
              </li>
              <li>
                La responsabilidad total de Handy Suites® no excederá el monto pagado por el usuario
                en los últimos 12 meses.
              </li>
              <li>
                El usuario es responsable de mantener respaldos independientes de su información crítica.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Cancelación y terminación</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>El usuario puede cancelar su suscripción en cualquier momento desde la configuración de su cuenta.</li>
              <li>
                Al cancelar, el acceso se mantiene hasta el final del periodo pagado.
                No se realizan reembolsos proporcionales.
              </li>
              <li>
                Los Datos del Cliente se conservarán por 30 días después de la cancelación, periodo durante
                el cual podrán exportarse. Transcurrido este plazo, los datos serán eliminados permanentemente.
              </li>
              <li>
                Handy Suites® se reserva el derecho de terminar el servicio con 30 días de aviso previo
                en caso de discontinuación del producto.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. Protección de datos personales</h2>
            <p className="mt-2">
              El tratamiento de datos personales se rige por nuestro{' '}
              <Link href="/privacidad" className="text-blue-600 hover:underline">Aviso de Privacidad</Link>,
              el cual cumple con la Ley Federal de Protección de Datos Personales en Posesión de los
              Particulares (LFPDPPP) y su Reglamento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Ley aplicable y jurisdicción</h2>
            <p className="mt-2">
              Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para la resolución
              de cualquier controversia, las partes se someten a la jurisdicción de los tribunales
              competentes en Guadalajara, Jalisco, México, renunciando a cualquier otro fuero que
              pudiera corresponderles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">11. Contacto</h2>
            <p className="mt-2">
              Para consultas sobre estos términos:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Correo: <a href="mailto:legal@handysuites.com" className="text-blue-600 hover:underline">legal@handysuites.com</a></li>
              <li>Sitio web: <a href="https://handysuites.com" className="text-blue-600 hover:underline">handysuites.com</a></li>
            </ul>
          </section>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
          <p>© 2026 Handy Suites® — Todos los derechos reservados</p>
          <div className="mt-2 flex justify-center gap-4">
            <Link href="/privacidad" className="text-blue-600 hover:underline">Aviso de Privacidad</Link>
            <Link href="/" className="text-blue-600 hover:underline">Inicio</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
