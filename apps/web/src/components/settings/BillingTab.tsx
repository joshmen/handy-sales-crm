import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Separator } from '@/components/ui/Separator';
import { Switch } from '@/components/ui/Switch';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Save, FileText, Upload } from 'lucide-react';
import { toast } from '@/hooks/useToast';

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
        description: 'El RFC no es válido',
        variant: 'destructive',
      });
      return;
    }

    // Validar código postal
    if (billingData.codigoPostal && billingData.codigoPostal.length !== 5) {
      toast({
        title: 'Error',
        description: 'El código postal debe tener 5 dígitos',
        variant: 'destructive',
      });
      return;
    }

    // Aquí iría la lógica para guardar en el backend
    console.log('Guardando datos de facturación:', billingData);
    toast({
      title: 'Configuración guardada',
      description: 'Los datos de facturación se han actualizado correctamente',
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
        console.log(`Subiendo ${field}:`, file.name);
        setBillingData({ ...billingData, [field]: file.name });
        toast({
          title: 'Archivo cargado',
          description: `${file.name} se ha cargado correctamente`,
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
          <CardTitle>Configuración de Facturación CFDI 4.0</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Activar facturación electrónica</Label>
              <p className="text-sm text-muted-foreground">
                Habilita la emisión de facturas electrónicas CFDI 4.0
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
          <CardTitle>Datos del Contribuyente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rfc">RFC *</Label>
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
              <Label htmlFor="regimen">Régimen Fiscal *</Label>
              <SearchableSelect
                value={billingData.regimenFiscal}
                onValueChange={(value) =>
                  setBillingData({ ...billingData, regimenFiscal: value })
                }
                options={REGIMENES_FISCALES}
                placeholder="Selecciona un régimen fiscal"
                disabled={!billingData.facturacionActiva}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="razonSocial">Razón Social *</Label>
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
            <Label htmlFor="nombreComercial">Nombre Comercial</Label>
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
          <CardTitle>Domicilio Fiscal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="calle">Calle *</Label>
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
                <Label htmlFor="numExt">No. Ext *</Label>
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
                <Label htmlFor="numInt">No. Int</Label>
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
              <Label htmlFor="colonia">Colonia *</Label>
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
              <Label htmlFor="cp">Código Postal *</Label>
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
              <Label htmlFor="municipio">Municipio/Delegación *</Label>
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
              <Label htmlFor="estado">Estado *</Label>
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
          <CardTitle>Configuración de Comprobantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serie">Serie</Label>
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
              <Label htmlFor="folio">Folio Inicial</Label>
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
              <Label htmlFor="lugarExp">Lugar de Expedición (CP) *</Label>
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
              <Label htmlFor="usoCfdi">Uso CFDI Predeterminado</Label>
              <SearchableSelect
                value={billingData.usoCFDI}
                onValueChange={(value) =>
                  setBillingData({ ...billingData, usoCFDI: value })
                }
                options={USOS_CFDI}
                placeholder="Selecciona un uso CFDI"
                disabled={!billingData.facturacionActiva}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipoComp">Tipo de Comprobante</Label>
              <SearchableSelect
                value={billingData.tipoComprobantePredeterminado}
                onValueChange={(value) =>
                  setBillingData({ ...billingData, tipoComprobantePredeterminado: value })
                }
                options={TIPOS_COMPROBANTE}
                placeholder="Selecciona un tipo de comprobante"
                disabled={!billingData.facturacionActiva}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="formaPago">Forma de Pago</Label>
              <SearchableSelect
                value={billingData.formaPagoPredeterminada}
                onValueChange={(value) =>
                  setBillingData({ ...billingData, formaPagoPredeterminada: value })
                }
                options={FORMAS_PAGO}
                placeholder="Selecciona una forma de pago"
                disabled={!billingData.facturacionActiva}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metodoPago">Método de Pago</Label>
              <SearchableSelect
                value={billingData.metodoPagoPredeterminado}
                onValueChange={(value) =>
                  setBillingData({ ...billingData, metodoPagoPredeterminado: value })
                }
                options={METODOS_PAGO}
                placeholder="Selecciona un método de pago"
                disabled={!billingData.facturacionActiva}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificados */}
      <Card>
        <CardHeader>
          <CardTitle>Certificados de Sello Digital (CSD)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Certificado (.cer)</Label>
              <div className="flex gap-2">
                <Input
                  value={billingData.certificadoCSD}
                  placeholder="No se ha cargado ningún certificado"
                  disabled
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFileUpload('certificadoCSD')}
                  disabled={!billingData.facturacionActiva}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Cargar
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Llave privada (.key)</Label>
              <div className="flex gap-2">
                <Input
                  value={billingData.llaveCSD}
                  placeholder="No se ha cargado ninguna llave"
                  disabled
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFileUpload('llaveCSD')}
                  disabled={!billingData.facturacionActiva}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Cargar
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordCSD">Contraseña del certificado</Label>
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
          <CardTitle>Proveedor Autorizado de Certificación (PAC)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pac">Nombre del PAC</Label>
              <Input
                id="pac"
                value={billingData.nombrePAC}
                onChange={(e) =>
                  setBillingData({ ...billingData, nombrePAC: e.target.value })
                }
                placeholder="Ej. Facturama, SW Sapien, etc."
                disabled={!billingData.facturacionActiva}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usuarioPac">Usuario PAC</Label>
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
            <Label htmlFor="passwordPac">Contraseña PAC</Label>
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
          <CardTitle>Información de Contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={billingData.correoElectronico}
                onChange={(e) =>
                  setBillingData({ ...billingData, correoElectronico: e.target.value })
                }
                placeholder="facturacion@empresa.com"
                disabled={!billingData.facturacionActiva}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={billingData.telefono}
                onChange={(e) =>
                  setBillingData({ ...billingData, telefono: e.target.value })
                }
                placeholder="(55) 1234-5678"
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
          {isUpdating ? 'Guardando...' : 'Guardar configuración de facturación'}
        </Button>
      </div>
    </div>
  );
};