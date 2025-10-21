'use client';

import { forwardRef } from 'react';
import type { ReceiptData } from '@/lib/print/format-receipt';
import { formatCurrency } from '@/lib/formatters';

interface PrintReceiptProps {
  receipt: ReceiptData;
}

/**
 * Print-optimized receipt component
 * Designed to work with both A4 printers (like LaserJet) and thermal printers (via browser print)
 */
export const PrintReceipt = forwardRef<HTMLDivElement, PrintReceiptProps>(
  ({ receipt }, ref) => {
    return (
      <div ref={ref} className="print-receipt">
        {/* Header */}
        <div className="receipt-header">
          <h1 className="receipt-title">JOLLOF EXPRESS</h1>
          <div className="receipt-divider"></div>
        </div>

        {/* Order Info */}
        <div className="receipt-section">
          <div className="receipt-row">
            <span className="receipt-label">Order:</span>
            <span className="receipt-value receipt-order-number">{receipt.orderNumber}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Date:</span>
            <span className="receipt-value">{receipt.orderDate} {receipt.orderTime}</span>
          </div>
        </div>

        <div className="receipt-divider-light"></div>

        {/* Customer Details */}
        <div className="receipt-section">
          <h2 className="receipt-section-title">CUSTOMER DETAILS</h2>
          <div className="receipt-row">
            <span className="receipt-label">Name:</span>
            <span className="receipt-value">{receipt.customerName}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Phone:</span>
            <span className="receipt-value">{receipt.customerPhone}</span>
          </div>
          {receipt.customerPhoneAlt && (
            <div className="receipt-row">
              <span className="receipt-label">Alt Phone:</span>
              <span className="receipt-value">{receipt.customerPhoneAlt}</span>
            </div>
          )}
          <div className="receipt-row">
            <span className="receipt-label">Type:</span>
            <span className="receipt-value receipt-type">{receipt.orderType.toUpperCase()}</span>
          </div>
        </div>

        {/* Delivery Address */}
        {receipt.orderType === 'delivery' && receipt.deliveryAddress && (
          <>
            <div className="receipt-section">
              <h2 className="receipt-section-title">DELIVERY ADDRESS</h2>
              {receipt.deliveryCity && (
                <div className="receipt-address-line">{receipt.deliveryCity}</div>
              )}
              <div className="receipt-address-line">{receipt.deliveryAddress}</div>
              {receipt.addressType && (
                <div className="receipt-row">
                  <span className="receipt-label">Type:</span>
                  <span className="receipt-value">{receipt.addressType}</span>
                </div>
              )}
              {receipt.unitNumber && (
                <div className="receipt-row">
                  <span className="receipt-label">Unit:</span>
                  <span className="receipt-value">{receipt.unitNumber}</span>
                </div>
              )}
              {receipt.deliveryInstructions && (
                <div className="receipt-instructions">
                  <div className="receipt-instructions-title">Delivery Instructions:</div>
                  <div className="receipt-instructions-text">{receipt.deliveryInstructions}</div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="receipt-divider-light"></div>

        {/* Items */}
        <div className="receipt-section">
          <h2 className="receipt-section-title">ITEMS</h2>
          <div className="receipt-divider-light"></div>
          
          {receipt.items.map((item, index) => (
            <div key={index} className="receipt-item">
              <div className="receipt-item-header">
                <span className="receipt-item-name">
                  {item.quantity}x {item.name}
                </span>
                <span className="receipt-item-price">{formatCurrency(item.price)}</span>
              </div>
              {item.variation && (
                <div className="receipt-item-detail">• {item.variation}</div>
              )}
              {item.addons.length > 0 && (
                <div className="receipt-item-detail">• Add-ons: {item.addons.join(', ')}</div>
              )}
              {item.specialInstructions && (
                <div className="receipt-item-special">
                  ⚠️ {item.specialInstructions}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Special Instructions Summary */}
        {receipt.specialInstructions.length > 0 && (
          <>
            <div className="receipt-divider-light"></div>
            <div className="receipt-section receipt-special-section">
              <h2 className="receipt-special-title">⚠️ SPECIAL INSTRUCTIONS</h2>
              {receipt.specialInstructions.map((instruction, index) => (
                <div key={index} className="receipt-special-item">
                  • {instruction}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="receipt-divider-light"></div>

        {/* Totals */}
        <div className="receipt-section receipt-totals">
          <div className="receipt-row">
            <span className="receipt-label">Subtotal:</span>
            <span className="receipt-value">{formatCurrency(receipt.subtotal)}</span>
          </div>
          {receipt.deliveryFee > 0 && (
            <div className="receipt-row">
              <span className="receipt-label">Delivery Fee:</span>
              <span className="receipt-value">{formatCurrency(receipt.deliveryFee)}</span>
            </div>
          )}
          {receipt.discount > 0 && (
            <div className="receipt-row">
              <span className="receipt-label">Discount:</span>
              <span className="receipt-value">-{formatCurrency(receipt.discount)}</span>
            </div>
          )}
          
          <div className="receipt-divider"></div>
          
          <div className="receipt-row receipt-total">
            <span className="receipt-label">TOTAL:</span>
            <span className="receipt-value">{formatCurrency(receipt.total)}</span>
          </div>
          
          <div className="receipt-divider"></div>
          
          <div className="receipt-payment-status">
            Payment: {receipt.paymentStatus} ({receipt.paymentMethod})
          </div>
        </div>

        <div className="receipt-divider-light"></div>

        {/* Kitchen Instructions */}
        <div className="receipt-section receipt-kitchen">
          <div className="receipt-kitchen-title">Kitchen - Start Prep Now!</div>
          {receipt.estimatedPrepTime && (
            <div className="receipt-kitchen-time">
              Estimated Time: {receipt.estimatedPrepTime} min
            </div>
          )}
        </div>

        <div className="receipt-divider"></div>

        {/* Print Styles - Hidden on screen, visible when printing */}
        <style jsx>{`
          /* Base styles */
          .print-receipt {
            font-family: 'Courier New', Courier, monospace;
            max-width: 80mm;
            margin: 0 auto;
            padding: 10mm;
            color: #000;
            background: #fff;
          }

          /* Header */
          .receipt-header {
            text-align: center;
            margin-bottom: 8mm;
          }

          .receipt-title {
            font-size: 20pt;
            font-weight: bold;
            margin: 0 0 4mm 0;
            letter-spacing: 2px;
          }

          /* Sections */
          .receipt-section {
            margin-bottom: 4mm;
          }

          .receipt-section-title {
            font-size: 11pt;
            font-weight: bold;
            margin: 0 0 2mm 0;
            text-transform: uppercase;
          }

          /* Rows */
          .receipt-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1mm;
            font-size: 10pt;
          }

          .receipt-label {
            font-weight: 600;
          }

          .receipt-value {
            text-align: right;
          }

          .receipt-order-number {
            font-weight: bold;
            font-size: 12pt;
          }

          .receipt-type {
            font-weight: bold;
          }

          /* Address */
          .receipt-address-line {
            font-size: 10pt;
            margin-bottom: 1mm;
          }

          .receipt-instructions {
            margin-top: 2mm;
            padding: 2mm;
            background: #f5f5f5;
            border-radius: 2mm;
          }

          .receipt-instructions-title {
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 1mm;
          }

          .receipt-instructions-text {
            font-size: 9pt;
          }

          /* Items */
          .receipt-item {
            margin-bottom: 3mm;
          }

          .receipt-item-header {
            display: flex;
            justify-content: space-between;
            font-size: 10pt;
            font-weight: 600;
            margin-bottom: 1mm;
          }

          .receipt-item-name {
            flex: 1;
          }

          .receipt-item-price {
            text-align: right;
            margin-left: 4mm;
          }

          .receipt-item-detail {
            font-size: 9pt;
            margin-left: 4mm;
            margin-bottom: 0.5mm;
            color: #444;
          }

          .receipt-item-special {
            font-size: 9pt;
            margin-left: 4mm;
            margin-top: 1mm;
            padding: 2mm;
            background: #fff3cd;
            border-radius: 2mm;
            font-weight: 600;
          }

          /* Special Instructions */
          .receipt-special-section {
            background: #fff3cd;
            padding: 3mm;
            border-radius: 2mm;
          }

          .receipt-special-title {
            font-size: 11pt;
            font-weight: bold;
            margin: 0 0 2mm 0;
          }

          .receipt-special-item {
            font-size: 9pt;
            font-weight: 600;
            margin-bottom: 1mm;
          }

          /* Totals */
          .receipt-totals {
            font-size: 10pt;
          }

          .receipt-total {
            font-size: 14pt;
            font-weight: bold;
          }

          .receipt-payment-status {
            text-align: center;
            font-size: 10pt;
            margin-top: 2mm;
          }

          /* Kitchen Section */
          .receipt-kitchen {
            text-align: center;
            padding: 3mm;
            background: #d4edda;
            border-radius: 2mm;
          }

          .receipt-kitchen-title {
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 1mm;
          }

          .receipt-kitchen-time {
            font-size: 10pt;
          }

          /* Dividers */
          .receipt-divider {
            border-top: 2px solid #000;
            margin: 3mm 0;
          }

          .receipt-divider-light {
            border-top: 1px dashed #666;
            margin: 3mm 0;
          }

          /* Print-specific styles */
          @media print {
            .print-receipt {
              padding: 0;
              max-width: 100%;
            }

            /* Remove default browser print margins */
            @page {
              margin: 10mm;
              size: auto;
            }

            /* Ensure no page breaks within items */
            .receipt-item,
            .receipt-section {
              page-break-inside: avoid;
            }
          }

          /* Screen preview styles */
          @media screen {
            .print-receipt {
              border: 1px solid #ccc;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              background: #fff;
            }
          }
        `}</style>
      </div>
    );
  }
);

PrintReceipt.displayName = 'PrintReceipt';
