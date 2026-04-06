-- CFDI Error Catalog: SAT Anexo 20 v4.0 + Finkok PAC errors
-- Run against handy_billing database

CREATE TABLE IF NOT EXISTS cfdi_error_catalog (
    codigo VARCHAR(20) PRIMARY KEY,
    descripcion_sat TEXT NOT NULL,
    campo_relacionado VARCHAR(100),
    mensaje_usuario TEXT NOT NULL,
    accion_sugerida TEXT NOT NULL,
    complemento VARCHAR(50) DEFAULT 'CFDI',
    activo BOOLEAN DEFAULT true
);

-- ═══════════════════════════════════════════════════════
-- SAT CFDI 4.0 — Comprobante (encabezado)
-- ═══════════════════════════════════════════════════════
INSERT INTO cfdi_error_catalog (codigo, descripcion_sat, campo_relacionado, mensaje_usuario, accion_sugerida) VALUES
('CFDI40101', 'El campo Fecha no cumple con el patrón requerido', 'Comprobante.Fecha', 'La fecha de la factura no tiene el formato correcto', 'Intente de nuevo. Si persiste, contacte soporte técnico.'),
('CFDI40102', 'El resultado de la digestión debe ser igual al resultado de la desencripción del sello', 'Comprobante.Sello', 'Error en la firma digital de la factura', 'Los certificados CSD pueden estar corruptos. Vuelva a subirlos en Configuración Fiscal.'),
('CFDI40103', 'Si el tipo de comprobante es T, N o P, el campo FormaPago no debe existir', 'Comprobante.FormaPago', 'Error en la forma de pago para este tipo de comprobante', 'Error interno — contacte soporte técnico.'),
('CFDI40104', 'El campo FormaPago no contiene un valor del catálogo c_FormaPago', 'Comprobante.FormaPago', 'La forma de pago seleccionada no es válida', 'Seleccione una forma de pago válida del catálogo SAT (01=Efectivo, 03=Transferencia, etc.).'),
('CFDI40106', 'El certificado no cumple con alguno de los valores permitidos', 'Comprobante.NoCertificado', 'El certificado CSD no es válido', 'Su CSD puede estar vencido o cancelado. Verifique su vigencia en el portal del SAT.'),
('CFDI40108', 'El campo SubTotal no es igual a la suma de los campos Importe de los conceptos', 'Comprobante.SubTotal', 'Error en el cálculo del subtotal', 'Error de cálculo interno — contacte soporte técnico.'),
('CFDI40109', 'El campo Descuento es mayor que el campo SubTotal', 'Comprobante.Descuento', 'El descuento es mayor que el subtotal', 'El descuento total no puede ser mayor al subtotal del pedido. Revise los descuentos aplicados.'),
('CFDI40110', 'El campo Moneda no contiene un valor del catálogo c_Moneda', 'Comprobante.Moneda', 'La moneda seleccionada no es válida', 'Seleccione una moneda válida (MXN, USD, etc.).'),
('CFDI40111', 'El campo TipoCambio no tiene el valor o no cumple con el patrón requerido', 'Comprobante.TipoCambio', 'El tipo de cambio no es válido', 'Para MXN el tipo de cambio debe ser 1. Para otras monedas ingrese el tipo de cambio del día.'),
('CFDI40114', 'El campo TipoCambio no debe existir cuando la moneda es MXN', 'Comprobante.TipoCambio', 'No debe especificarse tipo de cambio para pesos mexicanos', 'Error interno — contacte soporte técnico.'),
('CFDI40115', 'El campo TipoDeComprobante no contiene un valor del catálogo', 'Comprobante.TipoDeComprobante', 'El tipo de comprobante no es válido', 'Error interno — contacte soporte técnico.'),
('CFDI40117', 'El campo Exportacion no contiene un valor del catálogo c_Exportacion', 'Comprobante.Exportacion', 'El valor de exportación no es válido', 'Seleccione un valor de exportación válido del catálogo SAT.'),
('CFDI40118', 'El campo MetodoPago no contiene un valor del catálogo c_MetodoPago', 'Comprobante.MetodoPago', 'El método de pago no es válido', 'Seleccione PUE (pago en una sola exhibición) o PPD (pago en parcialidades).'),
('CFDI40120', 'El campo Total no es igual a la suma de SubTotal menos Descuento más Impuestos', 'Comprobante.Total', 'Error en el cálculo del total', 'Error de cálculo interno — contacte soporte técnico.'),
('CFDI40121', 'El campo Total no cumple con el límite inferior o superior', 'Comprobante.Total', 'El monto total está fuera del rango permitido', 'El monto total está fuera del rango permitido por el SAT para esta moneda.'),
('CFDI40122', 'El campo LugarExpedicion no contiene un valor del catálogo c_CodigoPostal', 'Comprobante.LugarExpedicion', 'El código postal del emisor no es válido', 'El código postal en Configuración Fiscal no es un C.P. válido del catálogo SAT.'),
('CFDI40124', 'Debe existir el campo Confirmacion cuando TipoCambio o Total están fuera de rango', 'Comprobante.Confirmacion', 'Se requiere código de confirmación', 'El monto o tipo de cambio requiere un código de confirmación especial del PAC.')
ON CONFLICT (codigo) DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- SAT CFDI 4.0 — Emisor
-- ═══════════════════════════════════════════════════════
INSERT INTO cfdi_error_catalog (codigo, descripcion_sat, campo_relacionado, mensaje_usuario, accion_sugerida) VALUES
('CFDI40132', 'El campo Rfc del emisor no cumple con el patrón establecido', 'Emisor.Rfc', 'El RFC del emisor no tiene formato válido', 'Corrija el RFC en Configuración Fiscal (12 caracteres para persona moral, 13 para persona física).'),
('CFDI40134', 'El Rfc del emisor no se encuentra en la lista de RFC inscritos no cancelados del SAT', 'Emisor.Rfc', 'El RFC del emisor no está registrado ante el SAT', 'El RFC en Configuración Fiscal no está registrado o fue cancelado ante el SAT. Verifíquelo.'),
('CFDI40135', 'La clave RegimenFiscal del emisor no es la que le corresponde de acuerdo al RFC', 'Emisor.RegimenFiscal', 'El régimen fiscal del emisor no corresponde', 'El régimen fiscal en Configuración Fiscal no coincide con el registrado ante el SAT. Corrija en el portal del SAT o en Configuración Fiscal.'),
('CFDI40139', 'El campo Nombre del emisor no pertenece al nombre asociado al RFC registrado', 'Emisor.Nombre', 'La razón social del emisor no coincide con el SAT', 'La razón social en Configuración Fiscal no coincide con la registrada ante el SAT. Debe ser exactamente igual.')
ON CONFLICT (codigo) DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- SAT CFDI 4.0 — Receptor (los más frecuentes)
-- ═══════════════════════════════════════════════════════
INSERT INTO cfdi_error_catalog (codigo, descripcion_sat, campo_relacionado, mensaje_usuario, accion_sugerida) VALUES
('CFDI40143', 'El RFC del receptor no se encuentra en la lista de RFC inscritos no cancelados del SAT', 'Receptor.Rfc', 'El RFC del cliente no está registrado ante el SAT', 'Verifique que el RFC del cliente sea correcto y esté vigente ante el SAT. Corrija en la edición del cliente.'),
('CFDI40145', 'El campo Nombre del receptor no corresponde al RFC registrado en SAT', 'Receptor.Nombre', 'La razón social del cliente no coincide con el SAT', 'La razón social del cliente no coincide con la registrada ante el SAT. Corrija en la edición del cliente.'),
('CFDI40146', 'El campo RegimenFiscalReceptor no contiene un valor conforme al RFC', 'Receptor.RegimenFiscalReceptor', 'El régimen fiscal del cliente no es válido para su RFC', 'El régimen fiscal del cliente no coincide con el registrado en el SAT. Corrija en la edición del cliente.'),
('CFDI40147', 'El campo DomicilioFiscalReceptor no coincide con el registrado en el SAT', 'Receptor.DomicilioFiscalReceptor', 'El código postal fiscal del cliente no coincide con el SAT', 'El C.P. fiscal del cliente no coincide con el registrado en el SAT. Corrija en la edición del cliente.'),
('CFDI40148', 'El valor del campo UsoCFDI no corresponde con el tipo de persona o régimen fiscal', 'Receptor.UsoCFDI', 'El Uso CFDI no es válido para este cliente', 'Cambie el Uso CFDI. Para público general (XAXX010101000) use S01. Para empresas consulte el catálogo SAT según su régimen.'),
('CFDI40149', 'El campo DomicilioFiscalReceptor no es igual al campo LugarExpedicion', 'Receptor.DomicilioFiscalReceptor', 'El C.P. fiscal del cliente no coincide con el lugar de expedición', 'Para RFC genérico (XAXX010101000), el C.P. fiscal del cliente debe ser igual al C.P. del emisor en Configuración Fiscal.'),
('CFDI40150', 'Si el RFC del receptor es XAXX010101000, el UsoCFDI debe ser S01', 'Receptor.UsoCFDI', 'Para público general el Uso CFDI debe ser S01', 'Cuando el RFC del cliente es XAXX010101000 (público general), el Uso CFDI debe ser S01 (Sin efectos fiscales).'),
('CFDI40157', 'El RFC del receptor debe ser XAXX010101000 o XEXX010101000 si no está registrado', 'Receptor.Rfc', 'El RFC del cliente no está registrado en el SAT', 'Si el cliente no tiene RFC registrado ante el SAT, use XAXX010101000 (público general nacional).')
ON CONFLICT (codigo) DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- SAT CFDI 4.0 — Conceptos
-- ═══════════════════════════════════════════════════════
INSERT INTO cfdi_error_catalog (codigo, descripcion_sat, campo_relacionado, mensaje_usuario, accion_sugerida) VALUES
('CFDI40126', 'La clave del campo ClaveProdServ no existe en el catálogo c_ClaveProdServ', 'Concepto.ClaveProdServ', 'La clave de producto/servicio SAT no es válida', 'La clave SAT asignada al producto no existe en el catálogo. Corrija en Mapeo Fiscal.'),
('CFDI40127', 'La clave del campo ClaveUnidad no existe en el catálogo c_ClaveUnidad', 'Concepto.ClaveUnidad', 'La clave de unidad SAT no es válida', 'La clave de unidad SAT asignada al producto no existe en el catálogo. Corrija en Mapeo Fiscal.'),
('CFDI40166', 'El campo ObjetoImp no contiene un valor del catálogo c_ObjetoImp', 'Concepto.ObjetoImp', 'El objeto de impuesto no es válido', 'Error en la configuración de impuestos del producto — contacte soporte técnico.'),
('CFDI40169', 'Si ObjetoImp es 01 (No objeto de impuesto), no debe existir el nodo Impuestos', 'Concepto.Impuestos', 'Conflicto: producto sin impuesto tiene nodo de impuestos', 'Error interno en la generación de impuestos — contacte soporte técnico.'),
('CFDI40170', 'Si ObjetoImp es 02 o 03, debe existir el nodo Impuestos', 'Concepto.Impuestos', 'El producto requiere impuestos pero no se calcularon', 'Error interno en la generación de impuestos — contacte soporte técnico.')
ON CONFLICT (codigo) DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- SAT CFDI 4.0 — Impuestos
-- ═══════════════════════════════════════════════════════
INSERT INTO cfdi_error_catalog (codigo, descripcion_sat, campo_relacionado, mensaje_usuario, accion_sugerida) VALUES
('CFDI40201', 'Cuando TipoDeComprobante es T o P, no debe existir el nodo Impuestos', 'Impuestos', 'Error en impuestos para este tipo de comprobante', 'Error interno — contacte soporte técnico.'),
('CFDI40203', 'El campo TotalImpuestosRetenidos no es igual a la suma de retenciones', 'Impuestos.TotalImpuestosRetenidos', 'Error en el cálculo de retenciones', 'Error de cálculo de retenciones — contacte soporte técnico.'),
('CFDI40206', 'El campo TotalImpuestosTrasladados no es igual a la suma de traslados', 'Impuestos.TotalImpuestosTrasladados', 'Error en el cálculo de IVA', 'Error de cálculo de IVA — contacte soporte técnico.'),
('CFDI40218', 'La clave del campo Impuesto de traslado no corresponde a un valor permitido', 'Impuestos.Traslado.Impuesto', 'El tipo de impuesto no es válido', 'Error en la configuración de impuestos — contacte soporte técnico.'),
('CFDI40222', 'El campo TipoFactor del traslado no contiene un valor del catálogo', 'Impuestos.Traslado.TipoFactor', 'El tipo de factor de impuesto no es válido', 'Error en la configuración de impuestos — contacte soporte técnico.'),
('CFDI40223', 'El campo TasaOCuota del traslado no tiene un valor válido', 'Impuestos.Traslado.TasaOCuota', 'La tasa de IVA no es válida', 'Verifique que la tasa de IVA sea correcta: 0.160000 (16%), 0.080000 (8%), o 0.000000 (0%).')
ON CONFLICT (codigo) DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- SAT CFDI 4.0 — Factura Global
-- ═══════════════════════════════════════════════════════
INSERT INTO cfdi_error_catalog (codigo, descripcion_sat, campo_relacionado, mensaje_usuario, accion_sugerida) VALUES
('CFDI40125', 'El campo TipoRelacion no contiene un valor del catálogo c_TipoRelacion', 'CfdiRelacionados.TipoRelacion', 'El tipo de relación con factura anterior no es válido', 'Seleccione un tipo de relación válido del catálogo SAT.'),
('CFDI40130', 'Si RFC receptor es XAXX010101000, debe existir el nodo InformacionGlobal', 'InformacionGlobal', 'Para público general se requiere factura global', 'Las facturas a público general (XAXX010101000) deben ser Factura Global con período definido.'),
('CFDI40131', 'El campo Periodicidad no contiene un valor del catálogo', 'InformacionGlobal.Periodicidad', 'La periodicidad de la factura global no es válida', 'Seleccione: 01 (Diario), 02 (Semanal), 03 (Quincenal), 04 (Mensual), 05 (Bimestral).'),
('CFDI40133', 'El campo Meses no contiene un valor del catálogo c_Meses', 'InformacionGlobal.Meses', 'El mes de la factura global no es válido', 'Seleccione un mes válido para el período de la factura global.'),
('CFDI40136', 'El campo Año no cumple con el patrón requerido', 'InformacionGlobal.Año', 'El año de la factura global no es válido', 'El año debe ser el actual o el inmediato anterior.'),
('CFDI40140', 'El UUID del comprobante relacionado no se encuentra en el SAT', 'CfdiRelacionados.UUID', 'La factura relacionada no existe en el SAT', 'El UUID de la factura relacionada no fue encontrado. Verifique que sea correcto y esté timbrada.')
ON CONFLICT (codigo) DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- Errores Finkok (PAC) — no son del SAT
-- ═══════════════════════════════════════════════════════
INSERT INTO cfdi_error_catalog (codigo, descripcion_sat, campo_relacionado, mensaje_usuario, accion_sugerida, complemento) VALUES
('300', 'El usuario o contraseña son inválidos', 'PAC.Credenciales', 'Credenciales del PAC incorrectas', 'Las credenciales de Finkok son incorrectas. Verifique FINKOK_USUARIO y FINKOK_PASSWORD en la configuración.', 'FINKOK'),
('301', 'XML mal formado', 'XML', 'Error en la estructura del XML', 'Error interno en la generación del XML — contacte soporte técnico.', 'FINKOK'),
('303', 'Sello no corresponde a emisor', 'Sello', 'La firma digital no corresponde al emisor', 'Los certificados CSD no corresponden al RFC del emisor. Verifique en Configuración Fiscal.', 'FINKOK'),
('304', 'Certificado revocado o caduco', 'Certificado', 'El certificado CSD está revocado o vencido', 'Su CSD fue revocado o venció. Solicite uno nuevo en el portal del SAT y súbalo en Configuración Fiscal.', 'FINKOK'),
('305', 'La fecha de emisión no está dentro de la vigencia del CSD del emisor', 'Certificado', 'La fecha está fuera de la vigencia del certificado', 'La fecha de emisión no está dentro del período de vigencia de su CSD. Verifique las fechas del certificado.', 'FINKOK'),
('306', 'El certificado no es de tipo CSD', 'Certificado', 'Está usando la FIEL en lugar del CSD', 'El archivo subido es una FIEL, no un CSD. Descargue el CSD desde el portal del SAT y súbalo en Configuración Fiscal.', 'FINKOK'),
('307', 'El CFDI contiene un timbre previo', 'Timbre', 'Esta factura ya fue timbrada', 'Esta factura ya tiene un timbre fiscal. No se puede timbrar dos veces.', 'FINKOK'),
('308', 'Certificado no expedido por el SAT', 'Certificado', 'El certificado no fue emitido por el SAT', 'El archivo .cer no fue emitido por el SAT. Descárguelo del portal oficial del SAT.', 'FINKOK'),
('401', 'Fecha y hora de generación fuera de rango', 'Fecha', 'La fecha de emisión está fuera del rango de 72 horas', 'La fecha de emisión debe estar dentro de las 72 horas anteriores o posteriores a la hora actual.', 'FINKOK'),
('402', 'RFC del emisor no se encuentra en el régimen de contribuyentes', 'Emisor.Rfc', 'El RFC del emisor no está activo ante el SAT', 'El RFC del emisor no está registrado en el régimen de contribuyentes del SAT.', 'FINKOK'),
('701', 'Cliente o RFC emisor suspendido', 'PAC.Cuenta', 'Su RFC está suspendido en Finkok', 'Contacte a Finkok para reactivar su RFC emisor en su panel de control.', 'FINKOK'),
('702', 'No ha registrado el RFC emisor bajo la cuenta de Finkok', 'PAC.Cuenta', 'RFC emisor no registrado en Finkok', 'Registre el RFC emisor en su panel de Finkok antes de timbrar.', 'FINKOK'),
('703', 'Cuenta suspendida', 'PAC.Cuenta', 'Su cuenta de Finkok está suspendida', 'Su cuenta de Finkok está suspendida. Contacte a Finkok para reactivarla.', 'FINKOK'),
('704', 'Error con la contraseña de la llave privada', 'LlavePrivada', 'La contraseña de la llave privada es incorrecta', 'La contraseña del archivo .key no es correcta. Vuelva a subir los certificados con la contraseña correcta en Configuración Fiscal.', 'FINKOK'),
('705', 'XML estructura inválida', 'XML', 'La estructura del XML no es válida', 'Error interno en la generación del XML — contacte soporte técnico.', 'FINKOK'),
('707', 'Timbre existente', 'Timbre', 'Esta factura ya fue timbrada previamente', 'Esta factura ya tiene un timbre fiscal vigente. No se puede timbrar dos veces.', 'FINKOK'),
('708', 'No se pudo conectar al SAT', 'SAT', 'No se pudo conectar con el SAT', 'El servicio del SAT no está disponible en este momento. Intente de nuevo en unos minutos.', 'FINKOK'),
('712', 'El atributo noCertificado no corresponde al certificado', 'Certificado', 'El número de certificado no coincide', 'El número de certificado no coincide con el archivo .cer subido. Vuelva a subir los certificados.', 'FINKOK'),
('718', 'Timbres agotados', 'PAC.Timbres', 'Se agotaron los timbres disponibles', 'Se agotaron los timbres de su cuenta. Adquiera más timbres en su panel de Finkok o actualice su plan.', 'FINKOK'),
('719', 'RFC del emisor no corresponde al noCertificado', 'Emisor.Rfc', 'El RFC del emisor no coincide con el certificado', 'El RFC del emisor no coincide con el del certificado CSD. Verifique que subió el CSD correcto.', 'FINKOK'),
('738', 'Errores con schemaLocations, namespaces y prefijos', 'XML', 'Error en los esquemas del XML', 'Error interno en la generación del XML — contacte soporte técnico.', 'FINKOK')
ON CONFLICT (codigo) DO NOTHING;
