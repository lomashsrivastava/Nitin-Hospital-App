"""
PDF Invoice Generator using ReportLab
Generates beautiful, colorful, landscape A4 invoices.
"""

import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Frame, PageTemplate
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

def generate_invoice_pdf(invoice):
    """Generate a gorgeous landscape PDF invoice with Nitin Medical Agency branding"""
    buffer = io.BytesIO()
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()
    
    # Custom Styles
    brand_color = colors.HexColor('#4f46e5')  # Indigo-600
    brand_light = colors.HexColor('#e0e7ff')  # Indigo-100
    accent_color = colors.HexColor('#ec4899') # Pink-500
    
    title_style = ParagraphStyle(
        'MainTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=colors.white,
        alignment=TA_CENTER,
        spaceAfter=0,
        fontName='Helvetica-Bold'
    )

    norm_bold = ParagraphStyle('NormBold', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, textColor=colors.darkgrey)
    norm = ParagraphStyle('Norm', parent=styles['Normal'], fontSize=10, textColor=colors.black)
    
    elements = []

    # ===== GORGEOUS COLORED HEADER BAND =====
    # We use a table with a background color to span the header
    header_data = [[Paragraph("Nitin Hospital", title_style)]]
    header_table = Table(header_data, colWidths=[doc.width])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), brand_color),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 8 * mm))

    # ===== CUSTOMER AND INVOICE META DATA (TWO COLUMNS) =====
    cust_data = [
        [
            Paragraph(f"<font color='#4f46e5'><b>BILL TO:</b></font>", norm_bold),
            Paragraph(f"<font color='#4f46e5'><b>INVOICE DETAILS:</b></font>", ParagraphStyle('RAlign', parent=norm_bold, alignment=TA_RIGHT))
        ],
        [
            Paragraph(f"<b>Customer Name:</b> {invoice.customer_name}", norm),
            Paragraph(f"<b>Invoice #:</b> <font color='#ec4899'>{invoice.invoice_number}</font>", ParagraphStyle('RAlign2', parent=norm, alignment=TA_RIGHT))
        ],
        [
            Paragraph(f"<b>Phone / Reg:</b> {invoice.customer_phone or 'N/A'}", norm),
            Paragraph(f"<b>Date:</b> {invoice.created_at.strftime('%B %d, %Y - %I:%M %p')}", ParagraphStyle('RAlign3', parent=norm, alignment=TA_RIGHT))
        ],
        [
            Paragraph("", norm),
            Paragraph(f"<b>Payment Mode:</b> {invoice.get_payment_method_display()}", ParagraphStyle('RAlign4', parent=norm, alignment=TA_RIGHT))
        ]
    ]

    meta_table = Table(cust_data, colWidths=[doc.width * 0.5, doc.width * 0.5])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 8 * mm))

    # ===== THE BEAUTIFUL ITEMS TABLE =====
    items_data = [
        ['#', 'Description (Medicine / Product Name)', 'Batch No.', 'Qty', 'Unit Price', 'GST Amount', 'Discount', 'Total (₹)']
    ]
    
    for idx, item in enumerate(invoice.items.all(), 1):
        items_data.append([
            str(idx),
            item.medicine_name[:45],
            item.batch_number[:15],
            str(item.quantity),
            f"₹{item.unit_price:.2f}",
            f"{item.gst_rate}% (₹{item.tax_amount:.2f})",
            f"₹{item.discount:.2f}" if float(item.discount) > 0 else "-",
            f"₹{item.total:.2f}",
        ])

    col_widths = [
        doc.width * 0.04,  # #
        doc.width * 0.36,  # Medicine Name (wider in landscape)
        doc.width * 0.12,  # Batch
        doc.width * 0.06,  # Qty
        doc.width * 0.10,  # Price
        doc.width * 0.12,  # GST combo
        doc.width * 0.08,  # Discount
        doc.width * 0.12,  # Total
    ]
    
    items_table = Table(items_data, colWidths=col_widths, repeatRows=1)
    items_table.setStyle(TableStyle([
        # Header Styling
        ('BACKGROUND', (0, 0), (-1, 0), brand_color),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (1, 0), (1, 0), 'LEFT'),  # Center all headers except Medicine Name
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        
        # Data rows
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'), # ID
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),   # Name
        ('ALIGN', (2, 1), (2, -1), 'CENTER'), # Batch
        ('ALIGN', (3, 1), (3, -1), 'CENTER'), # Qty
        ('ALIGN', (4, 1), (-1, -1), 'RIGHT'), # Financials
        
        # Alternating row colors
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, brand_light]),
        
        # Borders and margins
        ('LINEBELOW', (0, 0), (-1, 0), 2, brand_color),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 8 * mm))

    # ===== FINANCIAL SUMMARY BOX =====
    # We will put terms on the left side, and totals structured tightly on the right
    
    # Generate Totals Data
    totals_data = [
        ['Subtotal Amount:', f"₹ {invoice.subtotal:.2f}"],
    ]
    if invoice.discount_amount > 0:
        disc_label = f"Invoice Discount ({invoice.discount_value}{'%' if invoice.discount_type == 'PERCENTAGE' else '₹'}):"
        totals_data.append([disc_label, f"- ₹ {invoice.discount_amount:.2f}"])
    
    totals_data.extend([
        ['Total GST (Tax):', f"+ ₹ {invoice.total_tax:.2f}"],
    ])
    
    totals_data.append(['GRAND TOTAL:', f"₹ {invoice.total:.2f}"])
    
    totals_data.append(['Amount Paid:', f"₹ {invoice.amount_paid:.2f}"])
    if invoice.change_amount > 0:
        totals_data.append(['Balance Change:', f"₹ {invoice.change_amount:.2f}"])

    totals_table = Table(totals_data, colWidths=[doc.width * 0.2, doc.width * 0.15])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        
        # Highlight grand total specifically
        ('FONTSIZE', (0, -3), (1, -3), 13),
        ('FONTNAME', (0, -3), (1, -3), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, -3), (1, -3), brand_color),
        ('LINEABOVE', (0, -3), (1, -3), 2, brand_color),
        ('LINEBELOW', (0, -3), (1, -3), 2, brand_color),
        
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))

    # Wrap the totals table in an overarching dual-pane setup
    terms_text = """<b>Terms & Conditions:</b><br/>
    1. Goods once sold will not be taken back or exchanged unless expired within policies.<br/>
    2. Please secure your invoice for any future disputes or product claims.<br/>
    3. Visit us again. We care for your health!
    """
    
    dual_pane_data = [
        [Paragraph(terms_text, ParagraphStyle('Terms', parent=norm, fontSize=8, textColor=colors.HexColor('#64748b'), spaceAfter=5)), 
         totals_table]
    ]
    
    dual_table = Table(dual_pane_data, colWidths=[doc.width * 0.65, doc.width * 0.35])
    dual_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    
    elements.append(dual_table)
    elements.append(Spacer(1, 15 * mm))

    # ===== COLORED FOOTER BAND =====
    footer_data = [[Paragraph(f"Thank you for trusting <font color='#ec4899'><b>Nitin Medical Agency</b></font> • Computer Generated Document", ParagraphStyle('FooterStyle', parent=norm, alignment=TA_CENTER, textColor=colors.white, fontSize=9))]]
    footer_table = Table(footer_data, colWidths=[doc.width])
    footer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1e293b')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(footer_table)

    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer
