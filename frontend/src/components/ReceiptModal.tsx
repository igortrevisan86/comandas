import React from 'react';
import { Printer, X } from 'lucide-react';
import { Order } from '../types';
import { formatBRL, formatDateTime } from '../utils/formatters';

interface ReceiptModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  title?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  order,
  onClose,
  title = 'Comprovante / Pré-Conta',
}) => {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const activeItems = order.items.filter((item) => item.status === 'active');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Container - On screen and for print */}
        <div className="overflow-y-auto my-4 pr-1">
          <div
            id="printable-receipt"
            className="bg-white text-slate-900 font-mono text-xs p-6 rounded-lg shadow-inner border border-slate-300 space-y-3"
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-slate-400 pb-3">
              <div className="font-bold text-base tracking-wider">COMANDAPRO RESTAURANTE</div>
              <div className="text-[10px] text-slate-600">SISTEMA DE GESTÃO E PDV</div>
              <div className="text-[10px] text-slate-600">CNPJ: 00.000.000/0001-99</div>
              <div className="mt-2 text-sm font-extrabold uppercase">
                *** CARTÃO Nº {order.card_number_snapshot} ***
              </div>
              <div className="text-[10px] text-slate-500">
                Data: {formatDateTime(new Date().toISOString())}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                Ref: {order.id}
              </div>
            </div>

            {/* Items */}
            <div className="border-b border-dashed border-slate-400 pb-3 space-y-1.5">
              <div className="font-bold flex justify-between text-[11px]">
                <span>ITEM / DESCRIÇÃO</span>
                <span>SUBTOTAL</span>
              </div>
              {activeItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start text-[11px]">
                  <div className="pr-2">
                    <div>{item.product_name_snapshot}</div>
                    <div className="text-[10px] text-slate-600">
                      {item.quantity} x {formatBRL(item.unit_price_snapshot)}
                    </div>
                  </div>
                  <div className="font-semibold shrink-0">
                    {formatBRL(item.subtotal)}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-3">
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL CONSUMO:</span>
                <span>{formatBRL(order.total_amount)}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-semibold">
                <span>TOTAL PAGO:</span>
                <span>{formatBRL(order.total_paid)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1 border-t border-dotted border-slate-300">
                <span>SALDO DEVEDOR:</span>
                <span>{formatBRL(order.balance)}</span>
              </div>
            </div>

            {/* Payments breakdown */}
            {order.payments && order.payments.length > 0 && (
              <div className="border-b border-dashed border-slate-400 pb-3 space-y-1 text-[10px]">
                <div className="font-bold">PAGAMENTOS EFETUADOS:</div>
                {order.payments
                  .filter((p) => p.status === 'completed')
                  .map((p) => (
                    <div key={p.id} className="flex justify-between">
                      <span className="uppercase">
                        {p.method === 'cash' ? 'Dinheiro' : p.method.toUpperCase()}
                      </span>
                      <span>{formatBRL(p.amount)}</span>
                    </div>
                  ))}
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-500 pt-1">
              <div>Obrigado pela preferência!</div>
              <div>Documento não fiscal - Controle Interno</div>
              {order.status === 'closed' ? (
                <div className="font-bold text-emerald-800 mt-1">*** CONTA ENCERRADA ***</div>
              ) : (
                <div className="font-bold text-amber-800 mt-1">*** CONFERÊNCIA DE MESA / COMANDA ***</div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200 transition"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center gap-2 transition"
          >
            <Printer className="w-4 h-4" />
            Imprimir Cupom
          </button>
        </div>
      </div>
    </div>
  );
};
