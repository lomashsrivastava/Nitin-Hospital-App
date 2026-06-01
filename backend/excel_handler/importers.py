"""
Excel Importer - Parse and validate Excel/CSV files for inventory import
"""

import pandas as pd
from datetime import datetime
from inventory.models import Medicine, Supplier


# Standard column mappings
COLUMN_MAPPINGS = {
    'name': ['name', 'medicine_name', 'medicine', 'product', 'product_name', 'item', 'item_name', 'drug_name'],
    'generic_name': ['generic_name', 'generic', 'salt', 'composition'],
    'batch_number': ['batch_number', 'batch', 'batch_no', 'lot'],
    'barcode': ['barcode', 'bar_code', 'upc', 'sku'],
    'category': ['category', 'type', 'form', 'dosage_form'],
    'manufacturer': ['manufacturer', 'company', 'mfg', 'brand'],
    'mrp': ['mrp', 'maximum_retail_price', 'max_price'],
    'purchase_price': ['purchase_price', 'cost_price', 'cost', 'cp', 'buy_price'],
    'selling_price': ['selling_price', 'sale_price', 'sp', 'price', 'rate'],
    'gst_rate': ['gst_rate', 'gst', 'tax_rate', 'tax', 'gst_percent'],
    'hsn_code': ['hsn_code', 'hsn', 'sac'],
    'quantity': ['quantity', 'qty', 'stock', 'stock_qty', 'count', 'opening_stock'],
    'unit': ['unit', 'uom', 'pack'],
    'expiry_date': ['expiry_date', 'expiry', 'exp_date', 'exp', 'best_before'],
    'manufacturing_date': ['manufacturing_date', 'mfg_date', 'mfg_dt'],
    'rack_location': ['rack_location', 'rack', 'location', 'shelf'],
    'supplier_name': ['supplier_name', 'supplier', 'vendor', 'distributor'],
}


def auto_map_columns(df_columns):
    """Auto-detect column mappings from DataFrame columns"""
    mapping = {}
    df_cols_lower = {col.lower().strip().replace(' ', '_'): col for col in df_columns}
    
    for field, aliases in COLUMN_MAPPINGS.items():
        for alias in aliases:
            if alias in df_cols_lower:
                mapping[field] = df_cols_lower[alias]
                break
    
    return mapping


def parse_date(value):
    """Try to parse various date formats"""
    if pd.isna(value) or value == '' or value is None:
        return None
    
    if isinstance(value, datetime):
        return value.date()
    
    date_formats = [
        '%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%Y/%m/%d',
        '%d-%b-%Y', '%d-%B-%Y', '%m/%d/%Y', '%Y%m%d',
        '%d.%m.%Y', '%Y.%m.%d',
    ]
    
    value_str = str(value).strip()
    for fmt in date_formats:
        try:
            return datetime.strptime(value_str, fmt).date()
        except ValueError:
            continue
    
    return None


def validate_and_import(df, column_mapping, update_existing=True):
    """
    Validate DataFrame rows and import into database.
    Returns: (success_count, error_rows, warnings)
    """
    errors = []
    warnings = []
    success_count = 0
    created_count = 0
    updated_count = 0
    
    for idx, row in df.iterrows():
        row_num = idx + 2  # Excel row number (1-indexed + header)
        
        try:
            # Get mapped values
            name = str(row.get(column_mapping.get('name', ''), '')).strip()
            if not name or name == 'nan':
                errors.append({'row': row_num, 'error': 'Medicine name is required'})
                continue

            batch = str(row.get(column_mapping.get('batch_number', ''), '')).strip()
            if batch == 'nan':
                batch = ''

            # Prices
            try:
                mrp = float(row.get(column_mapping.get('mrp', ''), 0) or 0)
            except (ValueError, TypeError):
                mrp = 0
            
            try:
                purchase_price = float(row.get(column_mapping.get('purchase_price', ''), 0) or 0)
            except (ValueError, TypeError):
                purchase_price = 0
            
            try:
                selling_price = float(row.get(column_mapping.get('selling_price', ''), mrp) or mrp)
            except (ValueError, TypeError):
                selling_price = mrp

            if selling_price <= 0 and mrp <= 0:
                errors.append({'row': row_num, 'error': f'Invalid price for {name}'})
                continue

            if mrp <= 0:
                mrp = selling_price
            if purchase_price <= 0:
                purchase_price = selling_price * 0.8
            if selling_price <= 0:
                selling_price = mrp

            # Quantity
            try:
                quantity = int(float(row.get(column_mapping.get('quantity', ''), 0) or 0))
            except (ValueError, TypeError):
                quantity = 0

            # GST
            try:
                gst_rate = int(float(row.get(column_mapping.get('gst_rate', ''), 12) or 12))
                if gst_rate not in [0, 5, 12, 18, 28]:
                    gst_rate = 12
            except (ValueError, TypeError):
                gst_rate = 12

            # Expiry date
            expiry_val = row.get(column_mapping.get('expiry_date', ''), None)
            expiry_date = parse_date(expiry_val)
            if not expiry_date:
                # Default to 1 year from now
                from datetime import timedelta
                expiry_date = datetime.now().date() + timedelta(days=365)
                warnings.append({'row': row_num, 'warning': f'No valid expiry date for {name}, defaulting to 1 year'})

            # Category
            category = str(row.get(column_mapping.get('category', ''), 'TABLET')).strip().upper()
            valid_categories = ['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'DROPS', 'POWDER', 'SURGICAL', 'AYURVEDIC', 'OTHER']
            if category not in valid_categories:
                category = 'OTHER'

            # Optional fields
            generic_name = str(row.get(column_mapping.get('generic_name', ''), '')).strip()
            if generic_name == 'nan':
                generic_name = ''
            
            barcode = str(row.get(column_mapping.get('barcode', ''), '')).strip()
            if barcode == 'nan':
                barcode = ''
            
            manufacturer = str(row.get(column_mapping.get('manufacturer', ''), '')).strip()
            if manufacturer == 'nan':
                manufacturer = ''
            
            hsn_code = str(row.get(column_mapping.get('hsn_code', ''), '')).strip()
            if hsn_code == 'nan':
                hsn_code = ''
            
            unit = str(row.get(column_mapping.get('unit', ''), 'Pcs')).strip()
            if unit == 'nan':
                unit = 'Pcs'
            
            rack_location = str(row.get(column_mapping.get('rack_location', ''), '')).strip()
            if rack_location == 'nan':
                rack_location = ''

            # Supplier
            supplier = None
            supplier_name = str(row.get(column_mapping.get('supplier_name', ''), '')).strip()
            if supplier_name and supplier_name != 'nan':
                supplier, _ = Supplier.objects.get_or_create(
                    name=supplier_name,
                    defaults={'is_active': True}
                )

            # Manufacturing date
            mfg_val = row.get(column_mapping.get('manufacturing_date', ''), None)
            manufacturing_date = parse_date(mfg_val)

            # Check for existing medicine (by name + batch)
            existing = None
            if update_existing and batch:
                existing = Medicine.objects.filter(name__iexact=name, batch_number__iexact=batch).first()
            elif update_existing:
                existing = Medicine.objects.filter(name__iexact=name).first()

            if existing:
                # Update existing
                existing.mrp = mrp
                existing.purchase_price = purchase_price
                existing.selling_price = selling_price
                existing.quantity += quantity  # Add to existing stock
                existing.gst_rate = gst_rate
                existing.expiry_date = expiry_date
                if generic_name:
                    existing.generic_name = generic_name
                if barcode:
                    existing.barcode = barcode
                if manufacturer:
                    existing.manufacturer = manufacturer
                if supplier:
                    existing.supplier = supplier
                if manufacturing_date:
                    existing.manufacturing_date = manufacturing_date
                existing.save()
                updated_count += 1
            else:
                # Create new
                Medicine.objects.create(
                    name=name,
                    generic_name=generic_name,
                    batch_number=batch,
                    barcode=barcode,
                    category=category,
                    manufacturer=manufacturer,
                    mrp=mrp,
                    purchase_price=purchase_price,
                    selling_price=selling_price,
                    gst_rate=gst_rate,
                    hsn_code=hsn_code,
                    quantity=quantity,
                    unit=unit,
                    expiry_date=expiry_date,
                    manufacturing_date=manufacturing_date,
                    rack_location=rack_location,
                    supplier=supplier,
                )
                created_count += 1

            success_count += 1

        except Exception as e:
            errors.append({'row': row_num, 'error': str(e)})

    return {
        'success_count': success_count,
        'created_count': created_count,
        'updated_count': updated_count,
        'errors': errors,
        'warnings': warnings,
        'total_rows': len(df),
    }
