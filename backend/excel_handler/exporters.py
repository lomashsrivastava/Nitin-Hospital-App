"""
Excel Exporter - Export inventory, sales, GST, and profit reports to Excel
"""

import io
import pandas as pd
from django.utils import timezone
from datetime import timedelta

from inventory.models import Medicine
from billing.models import Invoice, InvoiceItem as BillingInvoiceItem
from purchases.models import Purchase
from hospital.models import Patient, ConsultationRecord, InpatientAdmission, MasterInvoice, InvoiceItem as HospitalInvoiceItem


def export_inventory():
    """Export all active inventory to Excel"""
    medicines = Medicine.objects.filter(is_active=True).select_related('supplier')
    
    data = []
    for m in medicines:
        data.append({
            'Name': m.name,
            'Generic Name': m.generic_name,
            'Batch Number': m.batch_number,
            'Barcode': m.barcode,
            'Category': m.get_category_display(),
            'Manufacturer': m.manufacturer,
            'MRP': float(m.mrp),
            'Purchase Price': float(m.purchase_price),
            'Selling Price': float(m.selling_price),
            'GST Rate (%)': m.gst_rate,
            'HSN Code': m.hsn_code,
            'Quantity': m.quantity,
            'Unit': m.unit,
            'Expiry Date': m.expiry_date.strftime('%d-%m-%Y') if m.expiry_date else '',
            'Supplier': m.supplier.name if m.supplier else '',
            'Rack Location': m.rack_location,
            'Low Stock': 'Yes' if m.is_low_stock else 'No',
            'Expired': 'Yes' if m.is_expired else 'No',
        })
    
    df = pd.DataFrame(data)
    buffer = io.BytesIO()
    
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Inventory', index=False)
        
        # Auto-adjust column widths
        worksheet = writer.sheets['Inventory']
        for col in worksheet.columns:
            max_length = max(len(str(cell.value or '')) for cell in col)
            col_letter = col[0].column_letter
            worksheet.column_dimensions[col_letter].width = min(max_length + 2, 40)
    
    buffer.seek(0)
    return buffer


def export_sales(days=30, start_date=None, end_date=None):
    """Export sales data to Excel"""
    if not start_date:
        start_date = timezone.now().date() - timedelta(days=days)
    if not end_date:
        end_date = timezone.now().date()

    invoices = Invoice.objects.filter(
        status='COMPLETED',
        created_at__date__gte=start_date,
        created_at__date__lte=end_date,
    ).prefetch_related('items')

    # Invoice summary sheet
    summary_data = []
    for inv in invoices:
        summary_data.append({
            'Invoice #': inv.invoice_number,
            'Date': inv.created_at.strftime('%d-%m-%Y %I:%M %p'),
            'Customer': inv.customer_name,
            'Phone': inv.customer_phone,
            'Subtotal': float(inv.subtotal),
            'Discount': float(inv.discount_amount),
            'CGST': float(inv.cgst),
            'SGST': float(inv.sgst),
            'Total Tax': float(inv.total_tax),
            'Total': float(inv.total),
            'Payment': inv.get_payment_method_display(),
        })

    # Item-wise sheet
    items_data = []
    for inv in invoices:
        for item in inv.items.all():
            items_data.append({
                'Invoice #': inv.invoice_number,
                'Date': inv.created_at.strftime('%d-%m-%Y'),
                'Medicine': item.medicine_name,
                'Batch': item.batch_number,
                'Qty': item.quantity,
                'Unit Price': float(item.unit_price),
                'GST Rate': f"{item.gst_rate}%",
                'Tax': float(item.tax_amount),
                'Total': float(item.total),
            })

    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        pd.DataFrame(summary_data).to_excel(writer, sheet_name='Invoice Summary', index=False)
        pd.DataFrame(items_data).to_excel(writer, sheet_name='Item Details', index=False)
        
        for sheet_name in writer.sheets:
            ws = writer.sheets[sheet_name]
            for col in ws.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                ws.column_dimensions[col[0].column_letter].width = min(max_len + 2, 40)

    buffer.seek(0)
    return buffer


def export_gst_report(days=30, start_date=None, end_date=None):
    """Export GST report to Excel"""
    if not start_date:
        start_date = timezone.now().date() - timedelta(days=days)
    if not end_date:
        end_date = timezone.now().date()

    invoices = Invoice.objects.filter(
        status='COMPLETED',
        created_at__date__gte=start_date,
        created_at__date__lte=end_date,
    )

    data = []
    for inv in invoices:
        data.append({
            'Invoice #': inv.invoice_number,
            'Date': inv.created_at.strftime('%d-%m-%Y'),
            'Customer': inv.customer_name,
            'Taxable Amount': float(inv.taxable_amount),
            'CGST': float(inv.cgst),
            'SGST': float(inv.sgst),
            'IGST': float(inv.igst),
            'Total Tax': float(inv.total_tax),
            'Total': float(inv.total),
        })

    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        pd.DataFrame(data).to_excel(writer, sheet_name='GST Report', index=False)
        
        ws = writer.sheets['GST Report']
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            ws.column_dimensions[col[0].column_letter].width = min(max_len + 2, 40)

    buffer.seek(0)
    return buffer


def export_profit_loss(days=30, start_date=None, end_date=None):
    """Export profit/loss report to Excel"""
    if not start_date:
        start_date = timezone.now().date() - timedelta(days=days)
    if not end_date:
        end_date = timezone.now().date()

    items = InvoiceItem.objects.filter(
        invoice__status='COMPLETED',
        invoice__created_at__date__gte=start_date,
        invoice__created_at__date__lte=end_date,
    ).select_related('medicine', 'invoice')

    data = []
    for item in items:
        purchase_price = float(item.medicine.purchase_price) if item.medicine else float(item.unit_price) * 0.7
        revenue = float(item.total)
        cost = purchase_price * item.quantity
        profit = revenue - cost

        data.append({
            'Invoice #': item.invoice.invoice_number,
            'Date': item.invoice.created_at.strftime('%d-%m-%Y'),
            'Medicine': item.medicine_name,
            'Qty': item.quantity,
            'Selling Price': float(item.unit_price),
            'Purchase Price': purchase_price,
            'Revenue': revenue,
            'Cost': round(cost, 2),
            'Profit': round(profit, 2),
            'Margin %': round((profit / revenue * 100) if revenue > 0 else 0, 2),
        })

    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        pd.DataFrame(data).to_excel(writer, sheet_name='Profit & Loss', index=False)
        
        ws = writer.sheets['Profit & Loss']
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            ws.column_dimensions[col[0].column_letter].width = min(max_len + 2, 40)

    buffer.seek(0)
    return buffer


def export_full_patient_data(patient_id):
    """
    Export all history for a specific patient to a multi-sheet Excel file.
    Includes: Profile, Consultations, Prescriptions, Admissions, and Invoices.
    """
    from django.shortcuts import get_object_or_404
    patient = get_object_or_404(Patient, id=patient_id)
    
    # 1. Profile Sheet
    profile_data = [{
        'Field': 'Patient Name', 'Value': patient.name}, 
       {'Field': 'Age', 'Value': patient.age},
       {'Field': 'Gender', 'Value': patient.gender},
       {'Field': 'Contact', 'Value': patient.contact_number},
       {'Field': 'Address', 'Value': patient.address},
       {'Field': 'Blood Group', 'Value': patient.blood_group},
       {'Field': 'Ailment', 'Value': patient.ailment},
       {'Field': 'Registered At', 'Value': patient.admission_date.strftime('%Y-%m-%d %H:%M') if patient.admission_date else ''}
    ]

    # 2. Consultations Sheet
    consults = ConsultationRecord.objects.filter(patient=patient).order_by('-created_at')
    consult_data = []
    for c in consults:
        consult_data.append({
            'Date': c.created_at.strftime('%Y-%m-%d %H:%M'),
            'Doctor': c.doctor.name if c.doctor else 'N/A',
            'Symptoms': c.symptoms,
            'Diagnosis': c.diagnosis,
            'Clinical Notes': c.clinical_notes
        })

    # 3. Prescriptions Sheet
    # Needs to join through ConsultationRecord
    from hospital.models import ConsultationPrescription
    prescriptions = ConsultationPrescription.objects.filter(consultation__patient=patient).order_by('-consultation__created_at')
    pres_data = []
    for p in prescriptions:
        pres_data.append({
            'Date': p.consultation.created_at.strftime('%Y-%m-%d'),
            'Medicine': p.medicine_name,
            'Dosage': p.dosage,
            'Frequency': p.frequency,
            'Duration': p.duration,
            'Dispensed': 'Yes' if p.is_dispensed else 'No'
        })

    # 4. Admissions Sheet
    admissions = InpatientAdmission.objects.filter(patient=patient).order_by('-admission_time')
    adm_data = []
    for a in admissions:
        adm_data.append({
            'Admitted At': a.admission_time.strftime('%Y-%m-%d %H:%M'),
            'Discharged At': a.discharge_time.strftime('%Y-%m-%d %H:%M') if a.discharge_time else 'Still Admitted',
            'Room': a.room.room_number if a.room else 'N/A',
            'Doctor': a.admitting_doctor.name if a.admitting_doctor else 'N/A',
            'Status': a.get_status_display()
        })

    # 5. Financial Summary Sheet
    invoices = MasterInvoice.objects.filter(patient=patient).order_by('-created_at')
    inv_summary = []
    for inv in invoices:
        inv_summary.append({
            'Invoice Date': inv.created_at.strftime('%Y-%m-%d %H:%M'),
            'Status': inv.get_status_display(),
            'Insurance Status': inv.get_insurance_status_display(),
            'Total Amount': float(inv.total_amount),
            'Discount': float(inv.discount),
            'Net Amount (Revenue)': float(inv.net_amount)
        })

    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        pd.DataFrame(profile_data).to_excel(writer, sheet_name='Patient Profile', index=False)
        pd.DataFrame(consult_data).to_excel(writer, sheet_name='Consultations', index=False)
        pd.DataFrame(pres_data).to_excel(writer, sheet_name='Prescriptions', index=False)
        pd.DataFrame(adm_data).to_excel(writer, sheet_name='Ward Stays', index=False)
        pd.DataFrame(inv_summary).to_excel(writer, sheet_name='Financials', index=False)
        
        for sheet_name in writer.sheets:
            ws = writer.sheets[sheet_name]
            for col in ws.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                ws.column_dimensions[col[0].column_letter].width = min(max_len + 5, 50)

    buffer.seek(0)
    return buffer
