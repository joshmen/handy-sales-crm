import { Metadata } from 'next';
import Link from 'next/link';
import { LandingNav } from '@/components/landing/LandingNav';

export const metadata: Metadata = {
  title: 'Términos de Servicio — Handy Suites®',
  description: 'Términos y condiciones de uso de Handy Suites. Conoce tus derechos y obligaciones como usuario de la plataforma.',
};

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-surface-2">
      <LandingNav />

      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground">Términos de Servicio</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última actualización: abril 2026</p>

        <div className="mt-8 space-y-8 text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Objeto</h2>
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
            <h2 className="text-xl font-semibold text-foreground">2. Definiciones</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li><strong>Usuario:</strong> toda persona que accede a la Plataforma con credenciales válidas.</li>
              <li><strong>Empresa/Tenant:</strong> la organización que contrata el servicio y crea cuentas para sus usuarios.</li>
              <li><strong>Administrador:</strong> usuario con permisos de gestión dentro de su empresa.</li>
              <li><strong>Plan:</strong> nivel de suscripción que determina funcionalidades y límites de uso.</li>
              <li><strong>Datos del Cliente:</strong> toda información ingresada por la empresa y sus usuarios en la Plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Cuentas de usuario</h2>
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
            <h2 className="text-xl font-semibold text-foreground">4. Planes y pagos</h2>
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
              <li>
                El módulo de facturación electrónica (CFDI 4.0) está disponible exclusivamente para
                operaciones realizadas en México y conforme a las disposiciones del Servicio de
                Administración Tributaria (SAT).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Uso aceptable</h2>
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
            <h2 className="text-xl font-semibold text-foreground">6. Propiedad intelectual y licencia de uso</h2>

            <h3 className="mt-4 text-lg font-medium text-foreground">6.1 Titularidad</h3>
            <p className="mt-2">
              Handy Suites® y todos sus componentes — incluyendo el código fuente, código objeto,
              arquitectura, bases de datos, esquemas, interfaces de usuario, logotipos, marcas,
              documentación técnica, algoritmos y las aplicaciones móviles disponibles para descarga
              (&quot;App Móvil&quot;) — son obras protegidas por la Ley Federal del Derecho de Autor (LFDA),
              en particular los artículos 101 a 114 que regulan los programas de computación, así como
              por los tratados internacionales de los que México es parte, incluyendo el Acuerdo ADPIC/TRIPS
              y el Tratado de la OMPI sobre Derecho de Autor.
            </p>
            <p className="mt-2">
              La totalidad de los derechos patrimoniales y morales sobre el Software pertenecen
              exclusivamente al titular de Handy Suites®. Ninguna disposición del presente
              Contrato transfiere al Usuario derecho alguno de propiedad sobre el Software o sus componentes.
            </p>

            <h3 className="mt-4 text-lg font-medium text-foreground">6.2 Concesión de licencia limitada</h3>
            <p className="mt-2">
              Sujeto al pago puntual de la suscripción vigente y al cumplimiento de estos Términos,
              se concede al Usuario una licencia de uso que es:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li><strong>No exclusiva</strong> — el titular puede conceder licencias similares a terceros.</li>
              <li><strong>Intransferible</strong> — el Usuario no puede ceder ni transferir esta licencia.</li>
              <li><strong>No sublicenciable</strong> — el Usuario no puede conceder a terceros el derecho de acceder o usar el Software.</li>
              <li><strong>Limitada en alcance</strong> — el acceso se otorga únicamente para los módulos incluidos en el Plan contratado, para el número de usuarios activos establecido en dicho Plan, y exclusivamente para fines internos de operación del negocio del Usuario.</li>
              <li><strong>Limitada en tiempo</strong> — la licencia se otorga durante el Período de Suscripción vigente y pagado; al término de dicho período, la licencia se extingue de pleno derecho.</li>
              <li><strong>Revocable</strong> — ante incumplimiento material de las obligaciones del Usuario, sin perjuicio de los demás derechos que asistan al titular.</li>
            </ul>

            <h3 className="mt-4 text-lg font-medium text-foreground">6.3 Restricciones de uso</h3>
            <p className="mt-2">
              El Usuario, sus empleados y cualquier tercero que actúe en su nombre, quedan expresamente
              prohibidos de:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Copiar o reproducir total o parcialmente el Software, sus interfaces o documentación.</li>
              <li>Modificar, adaptar o crear obras derivadas del Software, conforme al artículo 111 de la LFDA.</li>
              <li>Desensamblar, descompilar, realizar ingeniería inversa o intentar extraer el código fuente del Software o la App Móvil.</li>
              <li>Distribuir, revender, arrendar o transferir el acceso al Software a terceros ajenos a la organización del Usuario.</li>
              <li>Sublicenciar el Software o permitir que terceros accedan usando las credenciales del Usuario.</li>
              <li>Eliminar o alterar avisos de derechos de autor, marca registrada o propiedad intelectual.</li>
              <li>Usar el Software o el acceso API para desarrollar productos que compitan con Handy Suites®.</li>
              <li>Realizar scraping o extracción masiva automatizada de datos más allá de los límites del Plan contratado.</li>
            </ul>

            <h3 className="mt-4 text-lg font-medium text-foreground">6.4 App Móvil</h3>
            <p className="mt-2">
              La App Móvil de Handy Suites® disponible en App Store y Google Play constituye un programa
              de computación en los términos del artículo 101 de la LFDA. La descarga e instalación no
              otorga derecho de propiedad. La licencia está sujeta a los términos de la tienda de distribución
              correspondiente y queda condicionada a la vigencia del Plan de Suscripción activo. Ante cancelación
              o vencimiento de la suscripción, el acceso funcional a la App Móvil quedará deshabilitado de forma remota.
            </p>

            <h3 className="mt-4 text-lg font-medium text-foreground">6.5 Acceso API</h3>
            <p className="mt-2">
              El acceso a la API de Handy Suites®, cuando esté disponible en el Plan contratado, se otorga
              bajo una licencia adicional limitada para integrar los sistemas propios del Usuario con el
              Servicio. Esta licencia no faculta al Usuario para distribuir credenciales de API a terceros,
              construir productos que expongan la API a usuarios finales ajenos a su organización, ni
              exceder los límites de velocidad y volumen establecidos en el Plan.
            </p>

            <h3 className="mt-4 text-lg font-medium text-foreground">6.6 Datos del Usuario</h3>
            <p className="mt-2">
              Los datos del negocio que el Usuario carga, genera o almacena dentro de la Plataforma
              (clientes, productos, pedidos, facturas, etc.) son propiedad exclusiva del Usuario.
              Handy Suites® no reclama derechos de propiedad intelectual sobre dichos datos. El tratamiento
              de datos personales se regula por el{' '}
              <Link href="/privacidad" className="text-blue-600 hover:underline">Aviso de Privacidad</Link>.
            </p>

            <h3 className="mt-4 text-lg font-medium text-foreground">6.7 Violación de propiedad intelectual</h3>
            <p className="mt-2">
              El incumplimiento de las obligaciones de esta sección faculta al titular para revocar la licencia
              y suspender el acceso de forma inmediata, rescindir el Contrato, y ejercer las acciones civiles
              y penales que correspondan conforme a la LFDA (artículos 229-232), el Código Penal Federal
              (artículos 424-429) y demás legislación aplicable, incluyendo la reclamación de daños y perjuicios.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Limitación de responsabilidad</h2>
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
            <h2 className="text-xl font-semibold text-foreground">8. Cancelación y terminación</h2>
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
            <h2 className="text-xl font-semibold text-foreground">9. Protección de datos personales</h2>
            <p className="mt-2">
              El tratamiento de datos personales se rige por nuestro{' '}
              <Link href="/privacidad" className="text-blue-600 hover:underline">Aviso de Privacidad</Link>,
              el cual cumple con la Ley Federal de Protección de Datos Personales en Posesión de los
              Particulares (LFPDPPP, publicada en el DOF el 20 de marzo de 2025) y su Reglamento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Ley aplicable y jurisdicción</h2>
            <p className="mt-2">
              Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para la resolución
              de cualquier controversia, las partes se someten a la jurisdicción de los tribunales
              competentes en Guadalajara, Jalisco, México, renunciando a cualquier otro fuero que
              pudiera corresponderles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">11. Contacto</h2>
            <p className="mt-2">
              Para consultas sobre estos términos:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Correo: <a href="mailto:legal@handysuites.com" className="text-blue-600 hover:underline">legal@handysuites.com</a></li>
              <li>Sitio web: <a href="https://handysuites.com" className="text-blue-600 hover:underline">handysuites.com</a></li>
            </ul>
          </section>
        </div>

        <div className="mt-12 border-t border-border-subtle pt-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Handy Suites® — Todos los derechos reservados</p>
          <div className="mt-2 flex justify-center gap-4">
            <Link href="/privacidad" className="text-blue-600 hover:underline">Aviso de Privacidad</Link>
            <Link href="/" className="text-blue-600 hover:underline">Inicio</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
