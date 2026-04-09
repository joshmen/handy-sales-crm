import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Save, Upload } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { useTranslations } from 'next-intl';

interface BillingData {
  // Datos básicos
  rfc: string;
  razonSocial: string;
  nombreComercial: string;
  
  // Domicilio fiscal
  calle: string;
  numeroExterior: string;
  numeroInterior: string;
  colonia: string;
  municipio: string;
  estado: string;
  codigoPostal: string;
  
  // Régimen fiscal
  regimenFiscal: string;
  usoCFDI: string;
  
  // Contacto
  correoElectronico: string;
  telefono: string;
  
  // Certificados
  certificadoCSD: string;
  llaveCSD: string;
  passwordCSD: string;
  
  // Serie y folio
  serie: string;
  folioInicial: number;
  
  // PAC
  nombrePAC: string;
  usuarioPAC: string;
  passwordPAC: string;
  
  // Configuración
  facturacionActiva: boolean;
  lugarExpedicion: string;
  tipoComprobantePredeterminado: string;
  formaPagoPredeterminada: string;
  metodoPagoPredeterminado: string;
}

const REGIMENES_FISCALES = [
  { value: '601', label: '601 - General de Ley Personas Morales' },
  { value: '603', label: '603 - Personas Morales con Fines no Lucrativos' },
  { value: '605', label: '605 - Sueldos y Salarios' },
  { value: '606', label: '606 - Arrendamiento' },
  { value: '607', label: '607 - Enajenación o Adquisición de Bienes' },
  { value: '608', label: '608 - Demás ingresos' },
  { value: '612', label: '612 - Personas Físicas con Actividades Empresariales' },
  { value: '621', label: '621 - Incorporación Fiscal' },
  { value: '626', label: '626 - Régimen Simplificado de Confianza' },
];

const USOS_CFDI = [
  { value: 'G01', label: 'G01 - Adquisición de mercancías' },
  { value: 'G02', label: 'G02 - Devoluciones, descuentos o bonificaciones' },
  { value: 'G03', label: 'G03 - Gastos en general' },
  { value: 'I01', label: 'I01 - Construcciones' },
  { value: 'I02', label: 'I02 - Mobiliario y equipo de oficina' },
  { value: 'I03', label: 'I03 - Equipo de transporte' },
  { value: 'I04', label: 'I04 - Equipo de cómputo y accesorios' },
  { value: 'I08', label: 'I08 - Otra maquinaria y equipo' },
  { value: 'P01', label: 'P01 - Por definir' },
];

const FORMAS_PAGO = [
  { value: '01', label: '01 - Efectivo' },
  { value: '02', label: '02 - Cheque nominativo' },
  { value: '03', label: '03 - Transferencia electrónica' },
  { value: '04', label: '04 - Tarjeta de crédito' },
  { value: '28', label: '28 - Tarjeta de débito' },
  { value: '99', label: '99 - Por definir' },
];

const METODOS_PAGO = [
  { value: 'PUE', label: 'PUE - Pago en una sola exhibición' },
  { value: 'PPD', label: 'PPD - Pago en parcialidades o diferido' },
];

const TIPOS_COMPROBANTE = [
  { value: 'I', label: 'I - Ingreso' },
  { value: 'E', label: 'E - Egreso' },
  { value: 'T', label: 'T - Traslado' },
  { value: 'N', label: 'N - Nómina' },
  { value: 'P', label: 'P - Pago' },
];

interface BillingTabProps {
  isUpdating: boolean;
}

export const BillingTab: React.FC<BillingTabProps> = ({ isUpdating }) => {
  const t = useTranslations('billing.settingsTab');
  const [billingData, setBillingData] = useState<BillingData>({
    rfc: '',
    razonSocial: '',
    nombreComercial: '',
    calle: '',
    numeroExterior: '',
    numeroInterior: '',
    colonia: '',
    municipio: '',
    estado: '',
    codigoPostal: '',
    regimenFiscal: '601',
    usoCFDI: 'G03',
    correoElectronico: '',
    telefono: '',
    certificadoCSD: '',
    llaveCSD: '',
    passwordCSD: '',
    serie: '',
    folioInicial: 1,
    nombrePAC: '',
    usuarioPAC: '',
    passwordPAC: '',
    facturacionActiva: false,
    lugarExpedicion: '',
    tipoComprobantePredeterminado: 'I',
    formaPagoPredeterminada: '01',
    metodoPagoPredeterminado: 'PUE',
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<BillingData>(billingData);

  useEffect(() => {
    const changed = JSON.stringify(billingData) !== JSON.stringify(originalData);
    setHasChanges(changed);
  }, [billingData, originalData]);

  const handleSave = async () => {
    // Validar RFC
    if (billingData.rfc && !validarRFC(billingData.rfc)) {
      toast({
        title: 'Error',
        description: t('invalidRfc'),
        variant: 'destructive',
      });
      return;
    }

    // Validar código postal
    if (billingData.codigoPostal && billingData.codigoPostal.length !== 5) {
      toast({
        title: 'Error',
        description: t('invalidPostalCode'),
        variant: 'destructive',
      });
      return;
    }

    // Aquí iría la lógica para guardar en el backend
    toast({
      title: t('configSaved'),
      description: t('configSavedDesc'),
    });
    setOriginalData(billingData);
    setHasChanges(false);
  };

  const validarRFC = (rfc: string): boolean => {
    const rfcPattern = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
    return rfcPattern.test(rfc.toUpperCase());
  };

  const handleFileUpload = (field: 'certificadoCSD' | 'llaveCSD') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = field === 'certificadoCSD' ? '.cer' : '.key';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement)?.files?.[0];
      if (file) {
        // Aquí iría la lógica para subir el archivo
        setBillingData({ ...billingData, [field]: file.name });
        toast({
          title: t('fileUploaded'),
          description: t('fileUploadedDesc', { name: file.name }),
        });
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      {/* Activar facturación */}
      <Card>
        <CardHeader>
          <CardTitle>{t('cfdiTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('enableBilling')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('enableBillingDesc')}
              </p>
            </div>
            <Switch
              checked={billingData.facturacionActiva}
              onCheckedChange={(checked) =>
                setBillingData({ ...billingData, facturacionActiva: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Datos del contribuyente */}
      <Card>
        <CardHeader>
          <CardTitle>{t('taxpayerData')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rfc">{t('rfc')}</Label>
              <Input
                id="rfc"
                value={billingData.rfc}
                onChange={(e) =>
                  setBillingData({ ...billingData, rfc: e.target.value.toUpperCase() })
                }
                placeholder="XAXX010101000"
                maxLength={13}
                disabled={!billingData.facturacionActiva}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regimen">{t('taxRegime')}</Label>
              <SearchableSelect
                value={billingData.regimenFiscal}
                onChange={(value) =>
                  setBillingData({ ...billingData, regimenFiscal: String(value) })
                }
                options={REGIMENES_FISCALES}
                placeholder={t('selectTaxRegime')}
                disabled={!billingData.facturacionActiva}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="razonSocial">{t('businessName')}</Label>
            <Input
              id="razonSocial"
              value={billingData.razonSocial}
              onChange={(e) =>
                setBillingData({ ...billingData, razonSocial: e.target.value })
              }
              placeholder="Empresa S.A. de C.V."
              disabled={!billingData.facturacionActiva}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombreComercial">{t('commercialName')}</Label>
            <Input
              id="nombreComercial"
              value={billingData.nombreComercial}
              onChange={(e) =>
                setBillingData({ ...billingData, nombreComercial: e.target.value })
              }
              placeholder="Mi Empresa"
              disabled={!billingData.facturacionActiva}
            />
          </div>
        </CardContent>
      </Card>

      {/* Domicilio fiscal */}
      <Card>
        <CardHeader>
          <CardTitle>{t('fiscalAddress')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="calle">{t('street')}</Label>
              <Input
                id="calle"
                value={billingData.calle}
                onChange={(e) =>
                  setBillingData({ ...billingData, calle: e.target.value })
                }
                disabled={!billingData.facturacionActiva}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="numExt">{t('extNumber')}</Label>
                <Input
                  id="numExt"
                  value={billingData.numeroExterior}
                  onChange={(e) =>
                    setBillingData({ ...billingData, numeroExterior: e.target.value })
                  }
                  disabled={!billingData.facturacionActiva}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numInt">{t('intNumber')}</Label>
                <Input
                  id="numInt"
                  value={billingData.numeroInterior}
                  onChange={(e) =>
                    setBillingData({ ...billingData, numeroInterior: e.target.value })
                  }
                  disabled={!billingData.facturacionActiva}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="colonia">{t('neighborhood')}</Label>
              <Input
                id="colonia"
                value={billingData.colonia}
                onChange={(e) =>
                  setBillingData({ ...billingData, colonia: e.target.value })
                }
                disabled={!billingData.facturacionActiva}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp">{t('postalCode')}</Label>
              <Input
                id="cp"
                value={billingData.codigoPostal}
                onChange={(e) =>
                  setBillingData({ ...billingData, codigoPostal: e.target.value })
                }
                maxLength={5}
                disabled={!billingData.facturacionActiva}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="municipio">{t('municipality')}</Label>
              <Input
                id="municipio"
                value={billingData.municipio}
                onChange={(e) =>
                  setBillingData({ ...billingData, municipio: e.target.value })
                }
                disabled={!billingData.facturacionActiva}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">{t('state')}</Label>
              <Input
                id="estado"
                value={billingData.estado}
                onChange={(e) =>
                  setBillingData({ ...billingData, estado: e.target.value })
                }
                disabled={!billingData.facturacionActiva}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de comprobantes */}
      <Card>
        <CardHeader>
          <CardTitle>{t('voucherSettings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serie">{t('series')}</Label>
              <Input
                id="serie"
                value={billingData.serie}
                onChange={(e) =>
                  setBillingData({ ...billingData, serie: e.target.value.toUpperCase() })
                }
                placeholder="A"
                maxLength={10}
                disabled={!billingData.facturacionActiva}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folio">{t('initialFolio')}</Label>
              <Input
                id="folio"
                type="number"
                value={billingData.folioInicial}
                onChange={(e) =>
                  setBillingData({ ...billingData, folioInicial: parseInt(e.target.value) || 1 })
                }
                min="1"
                disabled={!billingData.facturacionActiva}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lugarExp">{t('issuancePlace')}</Label>
              <Input
                id="lugarExp"
                value={billingData.lugarExpedicion}
                onChange={(e) =>
                  setBillingData({ ...billingData, lugarExpedicion: e.target.value })
                }
                placeholder="06000"
                maxLength={5}
                disabled={!billingData.facturacionActiva}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usoCfdi">{t('defaultCfdiUse')}</Label>
              <SearchableSelect
                value={billingData.usoCFDI}
                onChange={(value) =>
                  setBillingData({ ...billingData, usoCFDI: String(value) })
                }
                options={USOS_CFDI}
                placeholder={t('selectCfdiUse')}
                disabled={!billingData.facturacionActiva}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipoComp">{t('voucherType')}</Label>
              <SearchableSelect
                value={billingData.tipoComprobantePredeterminado}
                onChange={(value) =>
                  setBillingData({ ...billingData, tipoComprobantePredeterminado: String(value) })
                }
                options={TIPOS_COMPROBANTE}
                placeholder={t('selectVoucherType')}
                disabled={!billingData.facturacionActiva}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="formaPago">{t('paymentForm')}</Label>
              <SearchableSelect
                value={billingData.formaPagoPredeterminada}
                onChange={(value) =>
                  setBillingData({ ...billingData, formaPagoPredeterminada: String(value) })
                }
                options={FORMAS_PAGO}
                placeholder={t('selectPaymentForm')}
                disabled={!billingData.facturacionActiva}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metodoPago">{t('paymentMethodLabel')}</Label>
              <SearchableSelect
                value={billingData.metodoPagoPredeterminado}
                onChange={(value) =>
                  setBillingData({ ...billingData, metodoPagoPredeterminado: String(value) })
                }
                options={METODOS_PAGO}
                placeholder={t('selectPaymentMethod')}
                disabled={!billingData.facturacionActiva}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificados */}
      <Card>
        <CardHeader>
          <CardTitle>{t('csdCertificates')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('certificate')}</Label>
              <div className="flex gap-2">
                <Input
                  value={billingData.certificadoCSD}
                  placeholder={t('noCertificateLoaded')}
                  disabled
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFileUpload('certificadoCSD')}
                  disabled={!billingData.facturacionActiva}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t('load')}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('privateKey')}</Label>
              <div className="flex gap-2">
                <Input
                  value={billingData.llaveCSD}
                  placeholder={t('noKeyLoaded')}
                  disabled
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFileUpload('llaveCSD')}
                  disabled={!billingData.facturacionActiva}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t('load')}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordCSD">{t('certificatePassword')}</Label>
              <Input
                id="passwordCSD"
                type="password"
                value={billingData.passwordCSD}
                onChange={(e) =>
                  setBillingData({ ...billingData, passwordCSD: e.target.value })
                }
                disabled={!billingData.facturacionActiva}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PAC */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pacTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pac">{t('pacName')}</Label>
              <Input
                id="pac"
                value={billingData.nombrePAC}
                onChange={(e) =>
                  setBillingData({ ...billingData, nombrePAC: e.target.value })
                }
                placeholder={t('pacNamePlaceholder')}
                disabled={!billingData.facturacionActiva}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usuarioPac">{t('pacUser')}</Label>
              <Input
                id="usuarioPac"
                value={billingData.usuarioPAC}
                onChange={(e) =>
                  setBillingData({ ...billingData, usuarioPAC: e.target.value })
                }
                disabled={!billingData.facturacionActiva}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passwordPac">{t('pacPassword')}</Label>
            <Input
              id="passwordPac"
              type="password"
              value={billingData.passwordPAC}
              onChange={(e) =>
                setBillingData({ ...billingData, passwordPAC: e.target.value })
              }
              disabled={!billingData.facturacionActiva}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contacto */}
      <Card>
        <CardHeader>
          <CardTitle>{t('contactInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                value={billingData.correoElectronico}
                onChange={(e) =>
                  setBillingData({ ...billingData, correoElectronico: e.target.value })
                }
                placeholder={t('emailPlaceholder')}
                disabled={!billingData.facturacionActiva}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">{t('phone')}</Label>
              <Input
                id="telefono"
                value={billingData.telefono}
                onChange={(e) =>
                  setBillingData({ ...billingData, telefono: e.target.value })
                }
                placeholder={t('phonePlaceholder')}
                disabled={!billingData.facturacionActiva}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botón guardar */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isUpdating || !hasChanges || !billingData.facturacionActiva}
        >
          <Save className="mr-2 h-4 w-4" />
          {isUpdating ? t('saving') : t('saveBillingConfig')}
        </Button>
      </div>
    </div>
  );
};