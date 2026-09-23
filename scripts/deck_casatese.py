from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import mm, inch
from reportlab.pdfgen import canvas
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, PageBreak, Image, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage
import os

# Carica font Barlow da ~/.fonts
font_dir = os.path.expanduser('~/.fonts/')
for fname in ['Barlow-Regular', 'Barlow-Bold', 'Barlow-SemiBold', 
              'BarlowCondensed-SemiBold', 'BarlowCondensed-Bold']:
    try:
        fpath = f'{font_dir}{fname}.ttf'
        if os.path.exists(fpath):
            pdfmetrics.registerFont(TTFont(fname, fpath))
    except:
        pass

# Colori Casatese
C_BLU = colors.HexColor('#003DA5')
C_ROSSO = colors.HexColor('#C41E3A')
C_ORO = colors.HexColor('#D4AF37')
C_BIANCO = colors.HexColor('#FFFFFF')
C_GRIGIO = colors.HexColor('#F5F7F9')

# Crea PDF
pdf_path = '/mnt/user-data/outputs/Foglio_gara_presentazione_Casatese.pdf'
w, h = landscape(A4)  # 297mm x 210mm

def header_casatese(canvas, x, y, width=280):
    """Disegna header con logo e titolo"""
    # Logo
    logo_path = '/mnt/user-data/outputs/casatese-logo.png'
    if os.path.exists(logo_path):
        canvas.drawImage(logo_path, x, y-25, width=25, height=25, preserveAspectRatio=True)
    
    # Titolo
    canvas.setFont('Barlow-Bold', 32)
    canvas.setFillColor(C_BLU)
    canvas.drawString(x+30, y-8, 'Foglio Gara')
    
    canvas.setFont('Barlow-Regular', 14)
    canvas.setFillColor(C_ROSSO)
    canvas.drawString(x+30, y-20, 'Casatese Merate')

def page_casatese(pdf_path):
    """Genera PDF"""
    doc = SimpleDocTemplate(pdf_path, pagesize=landscape(A4), 
                           leftMargin=20*mm, rightMargin=20*mm,
                           topMargin=30*mm, bottomMargin=20*mm)
    
    story = []
    styles = getSampleStyleSheet()
    
    # Stili personalizzati
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=42, fontName='Barlow-Bold',
        textColor=C_BLU, spaceAfter=12,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=28, fontName='Barlow-Bold',
        textColor=C_ROSSO, spaceAfter=10,
        alignment=TA_LEFT
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=11, fontName='Barlow-Regular',
        textColor=colors.HexColor('#15202B'),
        spaceAfter=8, leading=14
    )
    
    # PAGINA 1: Cover
    story.append(Spacer(1, 40*mm))
    logo_path = '/mnt/user-data/outputs/casatese-logo.png'
    if os.path.exists(logo_path):
        story.append(Image(logo_path, width=80*mm, height=80*mm))
    story.append(Spacer(1, 10*mm))
    story.append(Paragraph('Foglio Gara', title_style))
    story.append(Spacer(1, 5*mm))
    story.append(Paragraph('Gestione squadra, formazione e calci piazzati', body_style))
    story.append(Spacer(1, 15*mm))
    story.append(Paragraph('Casatese Merate', 
                          ParagraphStyle('subtitle', fontSize=18, 
                                       fontName='Barlow-Bold', 
                                       textColor=C_ROSSO, alignment=TA_CENTER)))
    
    story.append(PageBreak())
    
    # PAGINA 2: L'idea in breve
    story.append(Paragraph('L\'idea in breve', heading_style))
    story.append(Spacer(1, 10*mm))
    
    desc_style = ParagraphStyle('desc', fontSize=10, fontName='Barlow-Regular',
                               textColor=colors.HexColor('#5B6875'), leading=12)
    
    data = [
        [Paragraph('<b>Rosa e Formazione</b><br/>Gestisci giocatori,<br/>numeri, ruoli', desc_style),
         Paragraph('<b>Calci Piazzati</b><br/>Archivio schemi<br/>comuni', desc_style),
         Paragraph('<b>PDF Pronto</b><br/>Scarica in un clic<br/>per stampa', desc_style)],
    ]
    
    t = Table(data, colWidths=[80*mm, 80*mm, 80*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), C_GRIGIO),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 15),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
        ('GRID', (0, 0), (-1, -1), 1, C_ORO),
    ]))
    story.append(t)
    story.append(Spacer(1, 15*mm))
    
    story.append(Paragraph('<b style="color:#003DA5">Perché?</b> Stampa, leggi offline, condividi con un link.', 
                          body_style))
    
    story.append(PageBreak())
    
    # PAGINA 3: Come è organizzata
    story.append(Paragraph('Come è organizzata', heading_style))
    story.append(Spacer(1, 10*mm))
    
    story.append(Paragraph('<b style="color:#C41E3A">Ruoli</b>', 
                          ParagraphStyle('subhead', fontSize=13, fontName='Barlow-Bold',
                                       textColor=C_ROSSO)))
    story.append(Paragraph(
        '<b>Admin</b> (tu): crea squadre, gestisci rose, disegna schemi, scarica PDF.<br/>'
        '<b>Mister</b> (collega): accede con link, vede solo la sua squadra, compila partita e formazione.',
        body_style))
    story.append(Spacer(1, 10*mm))
    
    story.append(Paragraph('<b style="color:#D4AF37">In comune</b>', 
                          ParagraphStyle('subhead', fontSize=13, fontName='Barlow-Bold',
                                       textColor=C_ORO)))
    story.append(Paragraph(
        'Archivio schemi (calci piazzati) e moduli tattici condivisi tra tutte le squadre.',
        body_style))
    
    story.append(PageBreak())
    
    # PAGINA 4: Il lavoro del mister
    story.append(Paragraph('Il lavoro del mister', heading_style))
    story.append(Spacer(1, 10*mm))
    
    steps = [
        '1. Accedi con il link (codice squadra nell\'URL)',
        '2. Vedi la rosa già inserita e i moduli disponibili',
        '3. Compila formazione, panchina, scegli schema',
        '4. Scarica PDF per portare al campo'
    ]
    
    for step in steps:
        story.append(Paragraph(step, body_style))
    
    story.append(PageBreak())
    
    # PAGINA 5: I calci piazzati
    story.append(Paragraph('I calci piazzati', heading_style))
    story.append(Spacer(1, 10*mm))
    
    story.append(Paragraph(
        '<b style="color:#003DA5">Chi disegna:</b> solo tu (admin) puoi creare e modificare schemi.<br/>'
        '<b style="color:#003DA5">Chi usa:</b> i mister assegnano schemi alla partita, vedono una preview.<br/>'
        '<b style="color:#003DA5">Archivio:</b> schemi salvati e riutilizzabili per tutte le squadre.',
        body_style))
    
    story.append(PageBreak())
    
    # PAGINA 6: Il risultato
    story.append(Paragraph('Il risultato', heading_style))
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph(
        'PDF pronto da stampare: distinta dei giocatori + schema tattico scelto + calci piazzati.',
        body_style))
    
    story.append(PageBreak())
    
    # PAGINA 7: Stato
    story.append(Paragraph('Stato', heading_style))
    story.append(Spacer(1, 10*mm))
    
    story.append(Paragraph('<b style="color:#003DA5">✓ Già funzionante</b>', 
                          ParagraphStyle('check', fontSize=12, fontName='Barlow-Bold',
                                       textColor=C_BLU)))
    for item in [
        'App web multi-squadra con ruoli Admin/Mister',
        'Gestione rosa, formazione, panchina',
        'Archivio schemi e moduli',
        'Disegno di calci piazzati per admin',
        'PDF scaricabile'
    ]:
        story.append(Paragraph(f'• {item}', body_style))
    
    story.append(Spacer(1, 10*mm))
    story.append(Paragraph('<b style="color:#C41E3A">Da sviluppare (opzionale)</b>', 
                          ParagraphStyle('todo', fontSize=12, fontName='Barlow-Bold',
                                       textColor=C_ROSSO)))
    for item in [
        'Accesso sicuro (login reale anziché link con hash)',
        'Grafica e branding personalizzati',
        'Gestionale (archivio partite, statistiche)',
        'Libreria schemi più ricca'
    ]:
        story.append(Paragraph(f'• {item}', body_style))
    
    story.append(PageBreak())
    
    # PAGINA 8: Prossimi passi
    story.append(Paragraph('Prossimi passi', heading_style))
    story.append(Spacer(1, 10*mm))
    
    story.append(Paragraph(
        '1. <b>Testare con i dati reali:</b> inserisci rosa con numeri di maglia veri<br/>'
        '2. <b>Prova il link:</b> il collega accede e compila una formazione<br/>'
        '3. <b>Feedback e migliorie:</b> quale è il prossimo step che serve?',
        body_style))
    
    story.append(Spacer(1, 15*mm))
    
    q_style = ParagraphStyle('questions', 
                            fontSize=10, fontName='Barlow-Regular',
                            textColor=C_BIANCO, 
                            alignment=TA_LEFT,
                            leading=13,
                            backColor=C_BLU,
                            leftIndent=10, rightIndent=10,
                            topPadding=10, bottomPadding=10)
    
    story.append(Paragraph(
        '<b>Domande per il confronto:</b><br/>'
        '• Ti serve l\'accesso sicuro (login) o il link va bene?<br/>'
        '• Quali numeri e nomi di schemi usi nella realtà?<br/>'
        '• Serve anche un\'app mobile o basta il web?<br/>'
        '• Cosa dovrebbe essere "storicizzato" (archivio partite)?',
        q_style))
    
    # Build PDF
    doc.build(story)
    print(f'✓ PDF Casatese generato: {pdf_path}')

page_casatese(pdf_path)
