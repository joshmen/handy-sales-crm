'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  User,
  Buildings,
  UsersThree,
  CheckCircle,
  Camera,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash,
  Package,
  CurrencyCircleDollar,
  MapPin,
  Warehouse,
  Receipt,
  RocketLaunch,
  SkipForward,
  SquaresFour,
  Bag,
  Sparkle,
  CaretDown,
  Sliders,
} from '@phosphor-icons/react';
import { profileService } from '@/services/api/profileService';
import { companyService } from '@/services/api/companyService';
import { datosEmpresaService } from '@/services/api/datosEmpresa';
import { tenantService } from '@/services/api/tenants';
import { usersService } from '@/services/api/users';
import { subscriptionService } from '@/services/api/subscriptions';
import { toast } from '@/hooks/useToast';

// ─── Types ───

interface TeamInvite {
  email: string;
  rol: string;
}

interface WizardData {
  // Step 1: Profile
  avatarFile: File | null;
  avatarPreview: string | null;
  telefono: string;
  // Step 2: Company — General
  logoFile: File | null;
  logoPreview: string | null;
  nombreComercial: string;
  giro: string;
  telefonoEmpresa: string;
  paisEmpresa: string; // country code (MX, US, etc.)
  emailEmpresa: string;
  contacto: string;
  sitioWeb: string;
  // Step 2: Company — Fiscal (optional)
  showFiscal: boolean;
  razonSocial: string;
  identificadorFiscal: string;
  direccion: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  // Step 3: Team
  invites: TeamInvite[];
}

// ─── Validations ───

// RFC mexicano: 3-4 letras + 6 dígitos (fecha) + 3 homoclave
// Persona moral: 3 letras + 6 dígitos + 3 homoclave = 12
// Persona física: 4 letras + 6 dígitos + 3 homoclave = 13
const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

const validateRFC = (rfc: string): string | null => {
  if (!rfc) return null; // Optional
  if (rfc.length < 12 || rfc.length > 13) return 'El RFC debe tener 12 o 13 caracteres';
  if (!RFC_REGEX.test(rfc)) return 'Formato de RFC inválido';
  return null;
};

const validateCP = (cp: string): string | null => {
  if (!cp) return null; // Optional
  if (!/^\d{5}$/.test(cp)) return 'El código postal debe tener 5 dígitos';
  return null;
};

const validateEmail = (email: string): string | null => {
  if (!email) return null; // Optional
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Correo electrónico inválido';
  return null;
};

const GIRO_OPTIONS = [
  'Distribución',
  'Alimentos',
  'Bebidas',
  'Abarrotes',
  'Farmacia',
  'Ferretería',
  'Construcción',
  'Tecnología',
  'Servicios',
  'Otro',
];

const STEPS = [
  { id: 1, label: 'Tu Perfil', icon: User },
  { id: 2, label: 'Tu Empresa', icon: Buildings },
  { id: 3, label: 'Tu Equipo', icon: UsersThree },
  { id: 4, label: '¡Listo!', icon: CheckCircle },
];

const TOTAL_STEPS = STEPS.length;

// ─── Country Codes (LATAM-focused) ───

const COUNTRY_CODES = [
  { code: 'MX', dial: '+52', flag: '🇲🇽', name: 'México' },
  { code: 'US', dial: '+1', flag: '🇺🇸', name: 'Estados Unidos' },
  { code: 'GT', dial: '+502', flag: '🇬🇹', name: 'Guatemala' },
  { code: 'CO', dial: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: 'AR', dial: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: 'CL', dial: '+56', flag: '🇨🇱', name: 'Chile' },
  { code: 'PE', dial: '+51', flag: '🇵🇪', name: 'Perú' },
  { code: 'BR', dial: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: 'ES', dial: '+34', flag: '🇪🇸', name: 'España' },
  { code: 'HN', dial: '+504', flag: '🇭🇳', name: 'Honduras' },
  { code: 'SV', dial: '+503', flag: '🇸🇻', name: 'El Salvador' },
  { code: 'EC', dial: '+593', flag: '🇪🇨', name: 'Ecuador' },
];

function PhoneFlagInput({
  value,
  onChange,
  placeholder = '55 1234 5678',
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  // Parse dial code from value, default to MX
  const currentCountry = COUNTRY_CODES.find(c => value.startsWith(c.dial)) || COUNTRY_CODES[0];
  const phoneWithoutDial = currentCountry && value.startsWith(currentCountry.dial)
    ? value.slice(currentCountry.dial.length).trim()
    : value;

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = COUNTRY_CODES.find(c => c.code === e.target.value);
    if (country) {
      onChange(phoneWithoutDial ? `${country.dial} ${phoneWithoutDial}` : '');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    onChange(raw ? `${currentCountry.dial} ${raw}` : '');
  };

  return (
    <div className="flex items-center gap-0">
      <select
        value={currentCountry.code}
        onChange={handleCountryChange}
        className="w-[4.5rem] px-1.5 py-2.5 rounded-l-lg border border-r-0 border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 focus:border-green-600 cursor-pointer appearance-none text-center"
        title={currentCountry.name}
      >
        {COUNTRY_CODES.map(c => (
          <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>
        ))}
      </select>
      <input
        type="tel"
        value={phoneWithoutDial}
        onChange={handlePhoneChange}
        placeholder={placeholder}
        className="flex-1 px-3 py-2.5 rounded-r-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-600/50 focus:border-green-600"
      />
    </div>
  );
}

const ESTADOS_MEXICO = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
  'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México',
  'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit',
  'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
];

export default function OnboardingPage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [maxInvites, setMaxInvites] = useState(1); // default conservative (Trial/FREE = 2 users, admin = 1, so 1 invite)
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<WizardData>({
    avatarFile: null,
    avatarPreview: null,
    telefono: '',
    logoFile: null,
    logoPreview: null,
    nombreComercial: '',
    giro: '',
    telefonoEmpresa: '',
    paisEmpresa: 'MX',
    emailEmpresa: '',
    contacto: '',
    sitioWeb: '',
    showFiscal: false,
    razonSocial: '',
    identificadorFiscal: '',
    direccion: '',
    ciudad: '',
    estado: '',
    codigoPostal: '',
    invites: [{ email: '', rol: 'VENDEDOR' }],
  });

  // If already completed onboarding, redirect to dashboard
  useEffect(() => {
    if (session?.onboardingCompleted) {
      router.replace('/dashboard');
    }
  }, [session?.onboardingCompleted, router]);

  // Only ADMIN and SUPER_ADMIN should access onboarding
  useEffect(() => {
    if (session && session.user?.role !== 'ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
    }
  }, [session, router]);

  // Prevent back-button from going to login — replace history entry
  useEffect(() => {
    window.history.replaceState(null, '', '/onboarding');
  }, []);

  // Fetch plan limit for team invites
  useEffect(() => {
    subscriptionService.getCurrentSubscription()
      .then(sub => {
        // maxUsuarios includes the admin, so invites = maxUsuarios - 1
        const limit = Math.max(1, (sub.maxUsuarios || 2) - 1);
        setMaxInvites(limit);
      })
      .catch(() => {}); // Keep default of 1 if fetch fails
  }, []);

  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  // ─── File Handlers ───

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'La imagen no debe superar 5MB', variant: 'destructive' });
      return;
    }
    updateData({
      avatarFile: file,
      avatarPreview: URL.createObjectURL(file),
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'El logo no debe superar 5MB', variant: 'destructive' });
      return;
    }
    updateData({
      logoFile: file,
      logoPreview: URL.createObjectURL(file),
    });
  };

  // ─── Team Invite Handlers ───

  const addInvite = () => {
    if (data.invites.length >= maxInvites) return;
    updateData({ invites: [...data.invites, { email: '', rol: 'VENDEDOR' }] });
  };

  const removeInvite = (index: number) => {
    updateData({ invites: data.invites.filter((_, i) => i !== index) });
  };

  const updateInvite = (index: number, field: keyof TeamInvite, value: string) => {
    const updated = [...data.invites];
    updated[index] = { ...updated[index], [field]: value };
    updateData({ invites: updated });
  };

  // ─── Navigation ───

  const goNext = () => {
    // Validate Step 1: Profile — phone is required
    if (currentStep === 1) {
      if (!data.telefono || data.telefono.replace(/[^\d]/g, '').length < 7) {
        toast({ title: 'Ingresa tu número de teléfono', variant: 'destructive' });
        return;
      }
    }

    // Validate Step 2: Company — nombre comercial required + fiscal fields if filled
    if (currentStep === 2) {
      if (!data.nombreComercial.trim()) {
        toast({ title: 'El nombre comercial es obligatorio', variant: 'destructive' });
        return;
      }
      const isMx = data.paisEmpresa === 'MX';
      const rfcError = isMx && data.identificadorFiscal ? validateRFC(data.identificadorFiscal) : null;
      const cpError = isMx && data.codigoPostal ? validateCP(data.codigoPostal) : null;
      const emailError = data.emailEmpresa ? validateEmail(data.emailEmpresa) : null;
      if (rfcError || cpError || emailError) {
        toast({ title: rfcError || cpError || emailError || 'Revisa los campos', variant: 'destructive' });
        return;
      }
    }

    // Validate Step 3: Team — validate emails if any are filled
    if (currentStep === 3) {
      for (const invite of data.invites) {
        if (invite.email.trim() && !invite.email.includes('@')) {
          toast({ title: `Correo inválido: ${invite.email}`, variant: 'destructive' });
          return;
        }
      }
    }

    if (currentStep < TOTAL_STEPS) setCurrentStep(currentStep + 1);
  };

  const goBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // ─── Save & Complete ───

  const handleComplete = async () => {
    setSaving(true);
    try {
      // 1. Upload avatar if provided
      if (data.avatarFile && session?.user?.id) {
        try {
          await profileService.uploadAvatar(session.user.id, data.avatarFile);
        } catch (e) {
          console.warn('Onboarding: avatar upload failed', e);
        }
      }

      // 2. Upload company logo if provided
      if (data.logoFile) {
        try {
          await companyService.uploadLogo(data.logoFile);
        } catch (e) {
          console.warn('Onboarding: logo upload failed', e);
        }
      }

      // 3. Update company name (always attempt, even if other steps failed)
      if (data.nombreComercial) {
        try {
          await companyService.updateCompanySettings({ companyName: data.nombreComercial });
        } catch (e) {
          console.warn('Onboarding: company name update failed', e);
        }
      }

      // 4. Update DatosEmpresa (business data)
      const empresaData: Record<string, string> = {};
      // General fields
      if (data.telefonoEmpresa) empresaData.telefono = data.telefonoEmpresa;
      if (data.emailEmpresa) empresaData.email = data.emailEmpresa;
      if (data.contacto) empresaData.contacto = data.contacto;
      if (data.sitioWeb) empresaData.sitioWeb = data.sitioWeb;
      if (data.giro) empresaData.descripcion = data.giro;
      // Fiscal fields (optional)
      if (data.razonSocial) empresaData.razonSocial = data.razonSocial;
      if (data.identificadorFiscal) {
        empresaData.identificadorFiscal = data.identificadorFiscal;
        empresaData.tipoIdentificadorFiscal = 'RFC';
      }
      if (data.direccion) empresaData.direccion = data.direccion;
      if (data.ciudad) empresaData.ciudad = data.ciudad;
      if (data.estado) empresaData.estado = data.estado;
      if (data.codigoPostal) empresaData.codigoPostal = data.codigoPostal;

      if (Object.keys(empresaData).length > 0) {
        try {
          await datosEmpresaService.update(empresaData);
        } catch (e) {
          console.warn('Onboarding: datos empresa update failed', e);
        }
      }

      // 5. Send team invites — backend creates user + sends invitation email with "set password" link
      const validInvites = data.invites.filter(inv => inv.email.trim() && inv.email.includes('@'));
      for (const invite of validInvites) {
        try {
          // Random placeholder password — user will set their own via invitation email link
          const placeholder = crypto.randomUUID().replace(/-/g, '') + '!A1';
          await usersService.createUser({
            email: invite.email.trim(),
            password: placeholder,
            nombre: invite.email.split('@')[0],
            rol: invite.rol,
          });
        } catch {
          // Individual invite failure shouldn't block onboarding
          console.warn(`Failed to invite ${invite.email}`);
        }
      }

      // 6. Mark onboarding as completed
      await tenantService.completeOnboarding();

      // 7. Update NextAuth session so Layout doesn't redirect back to onboarding
      await updateSession({ onboardingCompleted: true });

      toast({ title: '¡Configuración completada!' });

      // Flag so Layout.tsx won't redirect back while session refreshes
      sessionStorage.setItem('onboarding-completed', '1');

      // Full page navigation to ensure the fresh session is loaded
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({ title: 'Error al guardar. Intenta de nuevo.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ───

  const userName = session?.user?.name || '';

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Onboarding animations (kept minimal — only fade-up for form fields + celebration) */}
      <style>{`
        @keyframes onb-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes onb-pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
          50%      { box-shadow: 0 0 12px 4px rgba(22, 163, 74, 0.25); }
        }
        @keyframes onb-check-pop {
          0%   { transform: scale(0); opacity: 0; }
          50%  { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes onb-confetti-1 {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-60px) rotate(180deg) translateX(30px); opacity: 0; }
        }
        @keyframes onb-confetti-2 {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-50px) rotate(-120deg) translateX(-25px); opacity: 0; }
        }
        @keyframes onb-confetti-3 {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-70px) rotate(200deg) translateX(15px); opacity: 0; }
        }
        .onb-fade-up     { animation: onb-fade-up 0.4s ease-out both; }
        .onb-pulse-glow  { animation: onb-pulse-glow 2s ease-in-out infinite; }
        .onb-check-pop   { animation: onb-check-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
        .onb-stagger-1 { animation-delay: 0.05s; }
        .onb-stagger-2 { animation-delay: 0.1s; }
        .onb-stagger-3 { animation-delay: 0.15s; }
      `}</style>

      {/* Left Side — Form */}
      <div className="flex flex-1 flex-col px-6 py-8 lg:px-16 lg:py-12 lg:max-w-[55%]">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Image src="/logo-icon.svg" alt="Handy Suites®" width={32} height={32} />
            <span className="text-lg font-semibold text-foreground">Handy Suites<sup className="text-[10px] ml-0.5">®</sup></span>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 mb-2">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden"
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    step.id <= currentStep
                      ? 'bg-green-600 w-full'
                      : 'w-0'
                  }`}
                  style={{
                    transitionDelay: step.id <= currentStep ? `${(step.id - 1) * 80}ms` : '0ms',
                  }}
                />
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Paso {currentStep} de {TOTAL_STEPS} — {STEPS[currentStep - 1].label}
          </p>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto">
          {currentStep === 1 && (
            <StepProfile
              userName={userName}
              data={data}
              avatarInputRef={avatarInputRef}
              onAvatarChange={handleAvatarChange}
              onUpdate={updateData}
            />
          )}
          {currentStep === 2 && (
            <StepCompany
              data={data}
              logoInputRef={logoInputRef}
              onLogoChange={handleLogoChange}
              onUpdate={updateData}
            />
          )}
          {currentStep === 3 && (
            <StepTeam
              invites={data.invites}
              maxInvites={maxInvites}
              onAddInvite={addInvite}
              onRemoveInvite={removeInvite}
              onUpdateInvite={updateInvite}
            />
          )}
          {currentStep === 4 && (
            <StepReady userName={userName} />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-8 border-t border-border mt-8">
          {currentStep > 1 ? (
            <button
              onClick={goBack}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            >
              <ArrowLeft size={16} />
              Atrás
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            {currentStep === 3 && (
              <button
                onClick={goNext}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
              >
                <SkipForward size={16} />
                Omitir
              </button>
            )}

            {currentStep < TOTAL_STEPS ? (
              <button
                onClick={goNext}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-success hover:bg-success/90 transition-colors rounded-lg shadow-sm onb-pulse-glow"
              >
                Continuar
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-success hover:bg-success/90 transition-colors rounded-lg shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <RocketLaunch size={16} weight="fill" />
                    Ir al Tablero
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right Side — Preview (desktop only, static) */}
      <div className="hidden lg:flex lg:w-[45%] bg-zinc-950 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-96 h-96 bg-green-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        </div>
        <PreviewPanel step={currentStep} data={data} userName={userName} />
      </div>
    </div>
  );
}

// ─── Input Helper ───

const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-600/50 focus:border-green-600';
const selectClass = 'w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 focus:border-green-600';
const labelClass = 'block text-sm font-medium text-foreground mb-1.5';

// ─── Step Components ───

function StepProfile({
  userName,
  data,
  avatarInputRef,
  onAvatarChange,
  onUpdate,
}: {
  userName: string;
  data: WizardData;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdate: (updates: Partial<WizardData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="onb-fade-up">
        <h1 className="text-2xl font-bold text-foreground">
          ¡Bienvenido{userName ? `, ${userName.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Vamos a configurar tu cuenta. Solo tomará un par de minutos.
        </p>
      </div>

      {/* Avatar Upload */}
      <div className="flex items-center gap-6 onb-fade-up onb-stagger-1">
        <div
          onClick={() => avatarInputRef.current?.click()}
          className="relative w-24 h-24 rounded-full bg-muted border-2 border-dashed border-border hover:border-green-500 cursor-pointer transition-colors flex items-center justify-center overflow-hidden group"
        >
          {data.avatarPreview ? (
            <Image
              src={data.avatarPreview}
              alt="Avatar"
              fill
              className="object-cover"
            />
          ) : (
            <Camera size={28} className="text-muted-foreground group-hover:text-green-600 transition-colors" />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera size={20} className="text-white" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Foto de perfil</p>
          <p className="text-xs text-muted-foreground">JPG, PNG o WebP. Máximo 5MB.</p>
        </div>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onAvatarChange}
          className="hidden"
        />
      </div>

      {/* Name (read-only, from registration) */}
      <div className="onb-fade-up onb-stagger-2">
        <label className={labelClass}>Nombre</label>
        <input
          type="text"
          value={userName}
          readOnly
          className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted text-muted-foreground text-sm cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground mt-1">Capturado durante el registro</p>
      </div>

      {/* Phone */}
      <div className="onb-fade-up onb-stagger-3">
        <label className={labelClass}>Teléfono personal</label>
        <PhoneFlagInput
          value={data.telefono}
          onChange={(val) => onUpdate({ telefono: val })}
        />
      </div>
    </div>
  );
}

function StepCompany({
  data,
  logoInputRef,
  onLogoChange,
  onUpdate,
}: {
  data: WizardData;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdate: (updates: Partial<WizardData>) => void;
}) {
  const isMexico = data.paisEmpresa === 'MX';
  const rfcError = isMexico && data.identificadorFiscal ? validateRFC(data.identificadorFiscal) : null;
  const cpError = isMexico && data.codigoPostal ? validateCP(data.codigoPostal) : null;
  const emailError = data.emailEmpresa ? validateEmail(data.emailEmpresa) : null;

  return (
    <div className="space-y-5">
      <div className="onb-fade-up">
        <h1 className="text-2xl font-bold text-foreground">Tu Empresa</h1>
        <p className="text-muted-foreground mt-1">
          Datos básicos de tu negocio. Todo esto aparece en reportes y documentos.
        </p>
      </div>

      {/* Logo Upload */}
      <div className="flex items-center gap-5 onb-fade-up onb-stagger-1">
        <div
          onClick={() => logoInputRef.current?.click()}
          className="relative w-20 h-20 rounded-xl bg-muted border-2 border-dashed border-border hover:border-green-500 cursor-pointer transition-colors flex items-center justify-center overflow-hidden group"
        >
          {data.logoPreview ? (
            <Image src={data.logoPreview} alt="Logo" fill className="object-contain p-1" />
          ) : (
            <Buildings size={28} className="text-muted-foreground group-hover:text-green-600 transition-colors" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Logo de empresa</p>
          <p className="text-xs text-muted-foreground">Aparece en sidebar, reportes y facturas</p>
        </div>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          onChange={onLogoChange}
          className="hidden"
        />
      </div>

      {/* Company Name + Country + Giro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Nombre comercial *</label>
          <input
            type="text"
            value={data.nombreComercial}
            onChange={e => onUpdate({ nombreComercial: e.target.value })}
            placeholder="Ej: Distribuidora Jeyma"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>País</label>
          <select
            value={data.paisEmpresa}
            onChange={e => onUpdate({ paisEmpresa: e.target.value })}
            className={selectClass}
          >
            {COUNTRY_CODES.map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Giro / industria</label>
          <select
            value={data.giro}
            onChange={e => onUpdate({ giro: e.target.value })}
            className={selectClass}
          >
            <option value="">Selecciona un giro</option>
            {GIRO_OPTIONS.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Teléfono de empresa</label>
          {(() => {
            const country = COUNTRY_CODES.find(c => c.code === data.paisEmpresa) || COUNTRY_CODES[0];
            const phoneWithoutDial = data.telefonoEmpresa.startsWith(country.dial)
              ? data.telefonoEmpresa.slice(country.dial.length).trim()
              : data.telefonoEmpresa.replace(/^\+\d+\s*/, '');
            return (
              <div className="flex items-center gap-0">
                <span className="inline-flex items-center px-2.5 py-2.5 rounded-l-lg border border-r-0 border-border bg-muted/50 text-sm text-muted-foreground select-none whitespace-nowrap">
                  {country.flag} {country.dial}
                </span>
                <input
                  type="tel"
                  value={phoneWithoutDial}
                  onChange={e => {
                    const raw = e.target.value;
                    onUpdate({ telefonoEmpresa: raw ? `${country.dial} ${raw}` : '' });
                  }}
                  placeholder="55 1234 5678"
                  className="flex-1 px-3 py-2.5 rounded-r-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-600/50 focus:border-green-600"
                />
              </div>
            );
          })()}
        </div>
        <div>
          <label className={labelClass}>Correo corporativo</label>
          <input
            type="email"
            value={data.emailEmpresa}
            onChange={e => onUpdate({ emailEmpresa: e.target.value })}
            placeholder="contacto@miempresa.com"
            className={`${inputClass} ${emailError ? 'border-red-500 focus:ring-red-500/50' : ''}`}
          />
          {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Persona de contacto</label>
          <input
            type="text"
            value={data.contacto}
            onChange={e => onUpdate({ contacto: e.target.value })}
            placeholder="Nombre del responsable"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Sitio web</label>
          <input
            type="url"
            value={data.sitioWeb}
            onChange={e => onUpdate({ sitioWeb: e.target.value })}
            placeholder="https://www.miempresa.com"
            className={inputClass}
          />
        </div>
      </div>

      {/* Fiscal Data — Collapsible */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => onUpdate({ showFiscal: !data.showFiscal })}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-muted-foreground" />
            <span>Datos fiscales</span>
            <span className="text-xs text-muted-foreground font-normal">(opcional — solo si vas a facturar)</span>
          </div>
          <CaretDown
            size={16}
            className={`text-muted-foreground transition-transform duration-200 ${data.showFiscal ? 'rotate-180' : ''}`}
          />
        </button>

        <div
          className="grid transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ gridTemplateRows: data.showFiscal ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className={`px-4 pb-4 space-y-4 border-t border-border pt-4 transition-opacity duration-300 ${data.showFiscal ? 'opacity-100' : 'opacity-0'}`}>

            {!isMexico && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  La facturación electrónica (CFDI) solo está disponible para México por el momento. Puedes capturar tu identificador fiscal de referencia.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Razón social</label>
                <input
                  type="text"
                  value={data.razonSocial}
                  onChange={e => onUpdate({ razonSocial: e.target.value })}
                  placeholder={isMexico ? 'Persona moral o física' : 'Nombre legal de la empresa'}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{isMexico ? 'RFC' : 'Identificador fiscal'}</label>
                <input
                  type="text"
                  value={data.identificadorFiscal}
                  onChange={e => onUpdate({ identificadorFiscal: isMexico ? e.target.value.toUpperCase() : e.target.value })}
                  placeholder={isMexico ? 'XAXX010101000' : 'NIT, RUC, CUIT, etc.'}
                  maxLength={isMexico ? 13 : 20}
                  className={`${inputClass} ${isMexico ? 'uppercase' : ''} ${rfcError ? 'border-red-500 focus:ring-red-500/50' : ''}`}
                />
                {isMexico && (
                  rfcError ? (
                    <p className="text-xs text-red-500 mt-1">{rfcError}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">12 caracteres (moral) o 13 (física)</p>
                  )
                )}
              </div>
            </div>

            <div>
              <label className={labelClass}>Dirección fiscal</label>
              <input
                type="text"
                value={data.direccion}
                onChange={e => onUpdate({ direccion: e.target.value })}
                placeholder="Calle y número"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Ciudad</label>
                <input
                  type="text"
                  value={data.ciudad}
                  onChange={e => onUpdate({ ciudad: e.target.value })}
                  placeholder="Ciudad"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{isMexico ? 'Estado' : 'Estado / Provincia'}</label>
                {isMexico ? (
                  <select
                    value={data.estado}
                    onChange={e => onUpdate({ estado: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Selecciona</option>
                    {ESTADOS_MEXICO.map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={data.estado}
                    onChange={e => onUpdate({ estado: e.target.value })}
                    placeholder="Estado o provincia"
                    className={inputClass}
                  />
                )}
              </div>
              <div>
                <label className={labelClass}>C.P.</label>
                <input
                  type="text"
                  value={data.codigoPostal}
                  onChange={e => onUpdate({ codigoPostal: isMexico ? e.target.value.replace(/\D/g, '') : e.target.value })}
                  placeholder={isMexico ? '00000' : 'Código postal'}
                  maxLength={isMexico ? 5 : 10}
                  className={`${inputClass} ${cpError ? 'border-red-500 focus:ring-red-500/50' : ''}`}
                />
                {cpError && <p className="text-xs text-red-500 mt-1">{cpError}</p>}
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Puedes completar o editar todo esto después en Ajustes {'>'} Perfil de Empresa.
      </p>
    </div>
  );
}

function StepTeam({
  invites,
  maxInvites,
  onAddInvite,
  onRemoveInvite,
  onUpdateInvite,
}: {
  invites: TeamInvite[];
  maxInvites: number;
  onAddInvite: () => void;
  onRemoveInvite: (index: number) => void;
  onUpdateInvite: (index: number, field: keyof TeamInvite, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="onb-fade-up">
        <h1 className="text-2xl font-bold text-foreground">Tu Equipo</h1>
        <p className="text-muted-foreground mt-1">
          Invita a tus colaboradores. Puedes hacerlo después desde Ajustes {'>'} Usuarios.
        </p>
      </div>

      <div className="space-y-3">
        {invites.map((invite, index) => (
          <div key={index} className="flex items-center gap-3">
            <input
              type="email"
              value={invite.email}
              onChange={e => onUpdateInvite(index, 'email', e.target.value)}
              placeholder="correo@ejemplo.com"
              className={`flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-600/50 focus:border-green-600`}
            />
            <select
              value={invite.rol}
              onChange={e => onUpdateInvite(index, 'rol', e.target.value)}
              className="w-36 shrink-0 px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 focus:border-green-600"
            >
              <option value="VENDEDOR">Vendedor</option>
              <option value="SUPERVISOR">Supervisor</option>
            </select>
            {invites.length > 1 && (
              <button
                onClick={() => onRemoveInvite(index)}
                className="p-2 text-muted-foreground hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <Trash size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {invites.length < maxInvites && (
        <button
          onClick={onAddInvite}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Agregar otro
        </button>
      )}

      <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-1">
        <p className="text-sm text-muted-foreground">
          Los usuarios invitados recibirán credenciales temporales. Podrán cambiar su contraseña al iniciar sesión.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Tu plan permite hasta {maxInvites + 1} usuarios en total (tú + {maxInvites} colaborador{maxInvites !== 1 ? 'es' : ''}).
        </p>
      </div>
    </div>
  );
}

function StepReady({ userName }: { userName: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8">
      {/* Celebration confetti particles */}
      <div className="relative mb-6">
        <div className="absolute -top-2 -left-4" style={{ animation: 'onb-confetti-1 1s ease-out 0.3s both' }}>
          <Sparkle size={16} weight="fill" className="text-amber-400" />
        </div>
        <div className="absolute -top-3 -right-3" style={{ animation: 'onb-confetti-2 1s ease-out 0.5s both' }}>
          <Sparkle size={14} weight="fill" className="text-green-400" />
        </div>
        <div className="absolute top-0 right-[-1.5rem]" style={{ animation: 'onb-confetti-3 1s ease-out 0.7s both' }}>
          <Sparkle size={12} weight="fill" className="text-indigo-400" />
        </div>
        <div className="absolute -bottom-1 -left-6" style={{ animation: 'onb-confetti-3 1.1s ease-out 0.4s both' }}>
          <Sparkle size={13} weight="fill" className="text-rose-400" />
        </div>

        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center onb-check-pop">
          <CheckCircle size={40} weight="fill" className="text-green-600" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-foreground onb-fade-up onb-stagger-1">
        ¡Todo listo{userName ? `, ${userName.split(' ')[0]}` : ''}!
      </h1>
      <p className="text-muted-foreground mt-2 max-w-md onb-fade-up onb-stagger-2">
        Tu espacio de trabajo está configurado. Puedes ajustar cualquier detalle desde la sección de Ajustes.
      </p>
      <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border max-w-sm w-full onb-fade-up onb-stagger-3">
        <p className="text-sm text-muted-foreground">
          Haz clic en <strong className="text-foreground">Ir al Tablero</strong> para comenzar a usar Handy Suites.
        </p>
      </div>
    </div>
  );
}

// ─── Preview Panel (Desktop Right Side) ───
// Static sidebar preview — shows all sections, updates company footer in real-time

function PreviewPanel({
  step,
  data,
  userName,
}: {
  step: number;
  data: WizardData;
  userName: string;
}) {
  return (
    <div className="relative z-10 w-full max-w-sm">
      {/* Mock Sidebar — matches real sidebar structure */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-2xl">

        {/* Nav Items with Sections */}
        <div className="px-2 py-3 space-y-0.5 overflow-y-auto max-h-[420px]">
          {/* Tablero */}
          <SidebarNavItem icon={<SquaresFour size={18} />} label="Tablero" active />

          {/* Ventas */}
          <SidebarSection label="Ventas" />
          <SidebarNavItem icon={<Bag size={18} />} label="Pedidos" badge="3" />
          <SidebarNavItem icon={<CurrencyCircleDollar size={18} />} label="Cobranza" />

          {/* Catálogo */}
          <SidebarSection label="Catálogo" />
          <SidebarNavItem icon={<Buildings size={18} />} label="Clientes" />
          <SidebarNavItem icon={<Package size={18} />} label="Productos" />

          {/* Operación */}
          <SidebarSection label="Operación" />
          <SidebarNavItem icon={<MapPin size={18} />} label="Rutas" />
          <SidebarNavItem icon={<Warehouse size={18} />} label="Inventarios" />

          {/* Facturación */}
          <SidebarSection label="Facturación" />
          <SidebarNavItem icon={<Receipt size={18} />} label="Facturación" />

          {/* Configuración */}
          <SidebarSection label="Configuración" />
          <SidebarNavItem icon={<Sliders size={18} />} label="Ajustes" />
        </div>

        {/* Bottom: Company + User */}
        <div className="border-t border-zinc-800 p-3">
          <div className="flex items-center gap-3 p-2 rounded-xl">
            {data.logoPreview ? (
              <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                <Image src={data.logoPreview} alt="" fill className="object-contain" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-emerald-600/15 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-emerald-400">
                  {(data.nombreComercial || 'ME').slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-zinc-200 truncate">
                {data.nombreComercial || 'Mi Empresa'}
              </p>
              <p className="text-xs text-zinc-500 truncate">
                {userName || 'Tu nombre'}
              </p>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-400 mt-0.5">
                ADMIN
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step-specific hints */}
      <div className="mt-6 text-center">
        <p className="text-sm text-zinc-400">
          {step === 1 && 'Tu perfil aparecerá en la parte inferior del sidebar'}
          {step === 2 && 'El logo, nombre y datos aparecen en reportes y facturas'}
          {step === 3 && 'Los usuarios invitados aparecerán en tu equipo'}
          {step === 4 && 'Tu espacio de trabajo está listo'}
        </p>
      </div>
    </div>
  );
}

function SidebarSection({ label }: { label: string }) {
  return (
    <div className="px-3 pt-4 pb-1">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{label}</p>
    </div>
  );
}

function SidebarNavItem({
  icon,
  label,
  active = false,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
      active
        ? 'bg-green-600/10 text-green-400'
        : 'text-zinc-400'
    }`}>
      <span className={active ? 'text-green-400' : 'text-zinc-500'}>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-600/20 text-green-400">
          {badge}
        </span>
      )}
    </div>
  );
}
