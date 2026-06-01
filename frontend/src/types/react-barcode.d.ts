declare module 'react-barcode' {
  import * as React from 'react';

  export interface BarcodeProps {
    value: string;
    format?: 'CODE39' | 'CODE128' | 'EAN13' | 'ITF14';
    width?: number;
    height?: number;
    displayValue?: boolean;
    fontOptions?: string;
    font?: string;
    textAlign?: string;
    textPosition?: 'bottom' | 'top';
    textMargin?: number;
    fontSize?: number;
    background?: string;
    lineColor?: string;
    margin?: number;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
  }

  const Barcode: React.ComponentType<BarcodeProps>;
  export default Barcode;
}
