USE handy_erp;

-- Crear tabla junction PromocionProductos
CREATE TABLE IF NOT EXISTS PromocionProductos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  promocion_id INT NOT NULL,
  producto_id INT NOT NULL,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (promocion_id) REFERENCES Promociones(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES Productos(id) ON DELETE CASCADE,
  UNIQUE(promocion_id, producto_id)
);

CREATE INDEX idx_promo_prod_promocion ON PromocionProductos(promocion_id);
CREATE INDEX idx_promo_prod_producto ON PromocionProductos(producto_id);
CREATE INDEX idx_promo_prod_tenant ON PromocionProductos(tenant_id);

-- Migrar datos existentes de producto_id a la tabla junction
INSERT INTO PromocionProductos (tenant_id, promocion_id, producto_id)
SELECT tenant_id, id, producto_id FROM Promociones WHERE producto_id IS NOT NULL;

-- Quitar columna producto_id de Promociones
ALTER TABLE Promociones DROP FOREIGN KEY Promociones_ibfk_2;
ALTER TABLE Promociones DROP COLUMN producto_id;
