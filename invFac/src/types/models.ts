export interface Product {
  id: string;
  barcode: string;
  descripcion: string;
  precio: number;
  stockActual: number;
  createdAt: string;
  updatedAt: string;
}

export interface MovimientoResumen {
  id: string;
  fecha: string;
  tipoMovimiento: "ENTRADA";
  proveedor: string | null;
  observacion: string | null;
  totalMovimiento: number;
  usuarioId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MovimientoDetalle {
  id: string;
  movimientoId: string;
  productoId: string;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  createdAt: string;
  totalVenta: number;
  usuarioId: string;
}

export interface SaleDetail {
  id: string;
  ventaId: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  createdAt: string;
}

export interface CartRow {
  productoId: string;
  barcode: string;
  descripcion: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}
