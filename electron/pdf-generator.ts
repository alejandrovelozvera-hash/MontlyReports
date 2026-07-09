import { jsPDF } from 'jspdf'
import fs from 'fs'
import path from 'path'
import { Jimp } from 'jimp'

interface Client {
  id: string; name: string; email: string; company: string
  color: string; notes: string; logo_path?: string
}
interface Design {
  id: string; title: string; description: string; category: string
  file_path: string; design_date: string; price?: number
  platform?: string; platform_cost?: number
}
interface GeneratePDFParams {
  client: Client; designs: Design[]; month: number; year: number
  monthName: string; personalMessage: string; templateColor: string
  templateStyle?: string; watermark?: string
  outputPath: string; onProgress: (p: number) => void
  company?: { name: string; ruc: string; phone: string; website: string; logoPath: string }
}

function hexToRgb(hex: string): [number,number,number] {
  const h = hex.replace('#','')
  return [parseInt(h.substring(0,2),16), parseInt(h.substring(2,4),16), parseInt(h.substring(4,6),16)]
}

function getImgBase64(fp: string): {data:string,fmt:string}|null {
  try {
    const raw = fs.readFileSync(fp)
    const ext = path.extname(fp).toLowerCase().replace('.','')
    return { data: raw.toString('base64'), fmt: ext==='png'?'PNG':'JPEG' }
  } catch { return null }
}

async function optimizeImage(fp: string, maxW: number, quality: number): Promise<{data:string,fmt:string}|null> {
  try {
    const img = await Jimp.read(fp) as any
    if (img.bitmap.width > maxW) {
      img.resize({ w: maxW })
    }
    const buf = await img.getBuffer('image/png', { quality } as any)
    return { data: buf.toString('base64'), fmt: 'PNG' }
  } catch {
    return getImgBase64(fp)
  }
}

function drawImg(doc: jsPDF, data: string, fmt: string, x: number, y: number, mw: number, mh: number) {
  try {
    let w=mw,h=mh
    try{const p=doc.getImageProperties(data);w=p.width;h=p.height}catch{}
    const ar=w/h; let iw=mw,ih=iw/ar
    if(ih>mh){ih=mh;iw=ih*ar}
    doc.addImage(data,fmt,x+(mw-iw)/2,y,iw,ih)
  } catch {
    doc.setFontSize(6);doc.setTextColor(150,150,150)
    doc.text('Sin imagen',x+mw/2,y+mh/2,{align:'center'})
  }
}

export async function generatePDF({
  client,designs,month,year,monthName,personalMessage,templateColor,
  templateStyle='classic',watermark='',outputPath,onProgress,company
}: GeneratePDFParams): Promise<void> {
  const doc = new jsPDF('p','mm','a4')
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const M=14; const cw=pw-M*2

  const accent=hexToRgb(templateColor||'#6366f1')
  const isDark=templateStyle!=='minimal'
  const BG:    [number,number,number]=isDark?[24,24,32]   :[255,255,255]
  const TEXT:  [number,number,number]=isDark?[240,240,245]:[23,23,23]
  const MUTED: [number,number,number]=isDark?[160,160,170]:[100,100,110]
  const CARD:  [number,number,number]=isDark?[36,36,46]   :[245,245,248]
  const GREEN: [number,number,number]=[34,197,94]
  const WHITE: [number,number,number]=[255,255,255]

  const totalDesigns=designs.reduce((s,d)=>s+(d.price||0),0)
  const totalPlatform=designs.reduce((s,d)=>s+(d.platform_cost||0),0)
  const total=totalDesigns+totalPlatform
  onProgress(5)

  // Precargar logo de la empresa
  let companyLogoData: {data:string,fmt:string}|null = null
  if (company?.logoPath && fs.existsSync(company.logoPath)) {
    companyLogoData = await optimizeImage(company.logoPath, 400, 60)
  }

  // Precargar imágenes (optimizadas con calidad reducida)
  const cache=new Map<string,{data:string,fmt:string}|null>()
  for(const d of designs){
    if(d.file_path&&fs.existsSync(d.file_path))
      cache.set(d.file_path,await optimizeImage(d.file_path, 400, 50))
  }
  if(client.logo_path&&fs.existsSync(client.logo_path))
    cache.set(client.logo_path,await optimizeImage(client.logo_path, 400, 60))

  onProgress(15)

  // ── Fondo ──
  doc.setFillColor(...BG);doc.rect(0,0,pw,ph,'F')
  if(templateStyle==='minimal'){doc.setFillColor(...accent);doc.rect(0,0,4,ph,'F')}
  doc.setFillColor(...accent);doc.rect(0,0,pw,3,'F')

  let y=10

  // ── COMPANY HEADER (logo + datos empresa) ──
  let logoH = 0
  if (companyLogoData) {
    try {
      const p = doc.getImageProperties(companyLogoData.data)
      const ar = p.width / p.height
      const logoW = 72
      logoH = logoW / ar
      doc.addImage(companyLogoData.data, companyLogoData.fmt, 8.9, y, logoW, logoH)
    } catch {}
  }
  if (company?.name) {
    doc.setFontSize(18); doc.setTextColor(...TEXT)
    doc.text(company.name, pw - M, y + 7, { align: 'right' })
    const ci: string[] = []
    if (company.ruc) ci.push(`RUC: ${company.ruc}`)
    if (company.phone) ci.push(`Tel: ${company.phone}`)
    if (company.website) ci.push(company.website)
    if (ci.length > 0) {
      doc.setFontSize(7); doc.setTextColor(...MUTED)
      doc.text(ci.join(' | '), pw - M, y + 14, { align: 'right' })
    }
  }

  // ── HEADER: nombre cliente + mes ──
  y = Math.max(y + logoH + 8, 50)
  let lx=0
  if(client.logo_path){
    const logo=cache.get(client.logo_path)
    if(logo){
      const maxDim=24
      try{const p=doc.getImageProperties(logo.data);const ar=p.width/p.height;let iw=maxDim,ih=iw/ar;if(ih>maxDim){ih=maxDim;iw=ih*ar}
      doc.addImage(logo.data,logo.fmt,M,y+(maxDim-ih)/2,iw,ih);lx=26}catch{}
    }
  }
  doc.setFontSize(18);doc.setTextColor(...TEXT)
  doc.text(client.name,M+lx,y+9)
  if(client.company){doc.setFontSize(7.5);doc.setTextColor(...accent);doc.text(client.company,M+lx,y+15)}
  doc.setFontSize(10);doc.setTextColor(...MUTED)
  doc.text(`${monthName} ${year}`,pw-M,y+9,{align:'right'})
  y+=26

  // ── TABLA DETALLE en header ──
  doc.setDrawColor(...accent);doc.setLineWidth(0.3);doc.line(M,y,pw-M,y);y+=4

  // Cabecera tabla
  doc.setFillColor(...accent);doc.rect(M,y,cw,5.5,'F')
  doc.setFontSize(6);doc.setTextColor(...WHITE)
  doc.text('Diseño',M+2,y+3.8)
  doc.text('Fecha',M+75,y+3.8)
  doc.text('Categoría',M+102,y+3.8)
  doc.text('Plataforma',M+128,y+3.8)
  doc.text('Precio',pw-M-2,y+3.8,{align:'right'})
  y+=6.5

  let alt=false
  for(const d of designs){
    if(y+5>190)break
    doc.setFillColor(...(alt
      ?(isDark?[32,32,42]as[number,number,number]:[249,249,252]as[number,number,number])
      :BG))
    doc.rect(M,y,cw,5,'F');alt=!alt
    const t=d.title.length>36?d.title.substring(0,34)+'…':d.title
    const dd=new Date(d.design_date)
    const ds=isNaN(dd.getTime())?'—':`${String(dd.getDate()).padStart(2,'0')}/${String(dd.getMonth()+1).padStart(2,'0')}/${dd.getFullYear()}`
    doc.setFontSize(6);doc.setTextColor(...TEXT);doc.text(t,M+2,y+3.5)
    doc.setTextColor(...MUTED)
    doc.text(ds,M+75,y+3.5)
    doc.text(d.category||'—',M+102,y+3.5)
    const plat=d.platform||'—'
    if(d.platform){doc.setTextColor(...accent);doc.setFontSize(5.5)}else{doc.setTextColor(...MUTED);doc.setFontSize(6)}
    doc.text(plat,M+128,y+3.5)
    doc.setFontSize(6)
    if(d.price&&d.price>0){doc.setTextColor(...GREEN);doc.text(`$${d.price.toFixed(2)}`,pw-M-2,y+3.5,{align:'right'})}
    else{doc.setTextColor(...MUTED);doc.text('—',pw-M-2,y+3.5,{align:'right'})}
    y+=5
  }

  // Total debajo de tabla
  doc.setDrawColor(...accent);doc.setLineWidth(0.3);doc.line(M,y,pw-M,y);y+=3
  if(total>0){
    doc.setFontSize(7);doc.setTextColor(...GREEN)
    if(totalPlatform>0){
      doc.text(`Diseños: $${totalDesigns.toFixed(2)}`,pw-M-2,y+2.5,{align:'right'})
      y+=4
      doc.text(`Pauta: $${totalPlatform.toFixed(2)}`,pw-M-2,y+2.5,{align:'right'})
      y+=4
    }
    doc.setFontSize(8.5)
    doc.text(`TOTAL  $${total.toFixed(2)}`,pw-M-2,y+3,{align:'right'})
  }
  y+=8

  // Mensaje personal
  if(personalMessage){
    doc.setFontSize(7);doc.setTextColor(...MUTED)
    const ls=doc.splitTextToSize(personalMessage,cw)
    doc.text(ls,M,y);y+=ls.length*3.8+3
  }

  doc.setDrawColor(...accent);doc.setLineWidth(0.4);doc.line(M,y,pw-M,y);y+=5

  onProgress(40)

  // ── GALERÍA con precio en cada foto ──
  const COLS=3
  const TW=(cw/COLS)-2
  // Calcular altura disponible para galería
  const availH=ph-y-16
  const maxRows=Math.floor(availH/(TW*0.75+3))
  const TH=Math.min(50,Math.floor((availH-maxRows*3)/maxRows))

  let row=0,col=0
  for(let i=0;i<designs.length;i++){
    const d=designs[i]
    if(y+TH>ph-16)break
    const tx=M+col*(TW+2)

    // Card
    doc.setFillColor(...CARD);doc.roundedRect(tx,y,TW,TH,1.5,1.5,'F')

    // Imagen
    const img=cache.get(d.file_path||'')
    if(img)drawImg(doc,img.data,img.fmt,tx+1,y+1,TW-2,TH-12)

    // Badge "PAUTADO" si tiene plataforma
    if(d.platform){
      doc.setFillColor(...accent)
      doc.roundedRect(tx+TW-18,y+2,16,4.5,1,1,'F')
      doc.setFontSize(3.5);doc.setTextColor(...WHITE)
      doc.text('PAUTADO',tx+TW-10,y+5,{align:'center'})
    }

    // Fondo semi-transparente para texto abajo
    doc.setFillColor(...(isDark?[20,20,30]as[number,number,number]:[230,230,235]as[number,number,number]))
    doc.rect(tx,y+TH-12,TW,12,'F')

    // Título
    doc.setFontSize(5.5);doc.setTextColor(...TEXT)
    const t=d.title.length>20?d.title.substring(0,18)+'…':d.title
    doc.text(t,tx+2,y+TH-8.5)

    // Descripción
    if(d.description){
      doc.setFontSize(4.5);doc.setTextColor(...MUTED)
      const desc=d.description.length>28?d.description.substring(0,26)+'…':d.description
      doc.text(desc,tx+2,y+TH-4.5)
    }

    // Precio en la foto
    if(d.price&&d.price>0){
      doc.setFontSize(5.5);doc.setTextColor(...GREEN)
      doc.text(`$${d.price.toFixed(2)}`,tx+TW-2,y+TH-8.5,{align:'right'})
    }

    // Platform + platform_cost
    if(d.platform){
      doc.setFontSize(4.5);doc.setTextColor(...MUTED)
      const platText=(d.platform_cost??0)>0?`${d.platform} $${(d.platform_cost??0).toFixed(2)}`:d.platform
      doc.text(platText,tx+TW-2,y+TH-4.5,{align:'right'})
    }

    // Fecha pequeña
    const dd=new Date(d.design_date)
    const ds=isNaN(dd.getTime())?'—':`${String(dd.getDate()).padStart(2,'0')}/${String(dd.getMonth()+1).padStart(2,'0')}`
    doc.setFontSize(4.5);doc.setTextColor(...MUTED)
    doc.text(ds,tx+2,y+TH-1)

    col++
    if(col>=COLS){col=0;row++;y+=TH+3}
  }

  // ── FOOTER — solo nombre + mes ──
  doc.setFillColor(...accent);doc.rect(0,ph-12,pw,12,'F')
  doc.setFontSize(7);doc.setTextColor(...WHITE)
  doc.text(client.name,M,ph-6)
  doc.text(`${monthName} ${year}`,pw/2,ph-6,{align:'center'})
  if(client.email)doc.text(client.email,pw-M,ph-6,{align:'right'})

  if(watermark){
    doc.saveGraphicsState();doc.setFontSize(32);doc.setTextColor(200,200,200)
    doc.text(watermark,pw/2,ph/2,{align:'center',angle:45});doc.restoreGraphicsState()
  }

  onProgress(90)

  // ── Página extra si no cupieron todos los diseños en la galería ──
  const lastIdx=Math.min(designs.length, COLS*Math.floor((ph-y-16)/(TH+3))+designs.length)
  const extra=designs.slice(lastIdx)
  if(extra.length>0){
    doc.addPage()
    doc.setFillColor(...BG);doc.rect(0,0,pw,ph,'F')
    doc.setFillColor(...accent);doc.rect(0,0,pw,3,'F')
    if(templateStyle==='minimal'){doc.setFillColor(...accent);doc.rect(0,0,4,ph,'F')}
    let gy=12
    doc.setFontSize(11);doc.setTextColor(...TEXT)
    doc.text(`${client.name} — continuación`,M,gy+7)
    doc.setFontSize(8);doc.setTextColor(...MUTED)
    doc.text(`${monthName} ${year}`,pw-M,gy+7,{align:'right'})
    gy+=14
    let ec=0
    for(let i=0;i<extra.length;i++){
      const d=extra[i];const tx=M+ec*(TW+2)
      if(gy+TH>ph-16)break
      doc.setFillColor(...CARD);doc.roundedRect(tx,gy,TW,TH,1.5,1.5,'F')
      const img=cache.get(d.file_path||'')
      if(img)drawImg(doc,img.data,img.fmt,tx+1,gy+1,TW-2,TH-12)
      if(d.platform){
        doc.setFillColor(...accent)
        doc.roundedRect(tx+TW-18,gy+2,16,4.5,1,1,'F')
        doc.setFontSize(3.5);doc.setTextColor(...WHITE)
        doc.text('PAUTADO',tx+TW-10,gy+5,{align:'center'})
      }
      doc.setFillColor(...(isDark?[20,20,30]as[number,number,number]:[230,230,235]as[number,number,number]))
      doc.rect(tx,gy+TH-12,TW,12,'F')
      doc.setFontSize(5.5);doc.setTextColor(...TEXT)
      doc.text(d.title.length>20?d.title.substring(0,18)+'…':d.title,tx+2,gy+TH-8.5)
      if(d.description){
        doc.setFontSize(4.5);doc.setTextColor(...MUTED)
        doc.text(d.description.length>28?d.description.substring(0,26)+'…':d.description,tx+2,gy+TH-4.5)
      }
      if(d.price&&d.price>0){doc.setTextColor(...GREEN);doc.text(`$${d.price.toFixed(2)}`,tx+TW-2,gy+TH-8.5,{align:'right'})}
      if(d.platform){
        doc.setFontSize(4.5);doc.setTextColor(...MUTED)
        doc.text((d.platform_cost??0)>0?`${d.platform} $${(d.platform_cost??0).toFixed(2)}`:d.platform,tx+TW-2,gy+TH-4.5,{align:'right'})
      }
      ec++
      if(ec>=COLS){ec=0;gy+=TH+3}
    }
    doc.setFillColor(...accent);doc.rect(0,ph-12,pw,12,'F')
    doc.setFontSize(7);doc.setTextColor(...WHITE)
    doc.text(client.name,M,ph-6)
    doc.text(`${monthName} ${year}`,pw/2,ph-6,{align:'center'})
  }

  onProgress(95)
  fs.writeFileSync(outputPath,Buffer.from(doc.output('arraybuffer')))
  onProgress(100)
}

export async function generateProformaPDF(params: {
  client: any; items: any[]; notes: string; validDays: number
  proformaNum: string; date: string; total: number; outputPath: string
  company?: { name: string; ruc: string; phone: string; website: string; logoPath: string }
  proformaColor?: string; isGeneralClient?: boolean; clientCity?: string
  templatePath?: string
}): Promise<void> {
  const { client, items, notes, proformaNum, date, total, outputPath, company, proformaColor, isGeneralClient, clientCity, templatePath } = params
  const doc = new jsPDF('p','mm','a4')
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const M = 18; const cw = pw - M*2

  const accent: [number,number,number] = hexToRgb(proformaColor || '#5046B5')
  const dark: [number,number,number] = [23,23,23]
  const gray: [number,number,number] = [100,100,110]
  const light: [number,number,number] = [248,248,252]
  const white: [number,number,number] = [255,255,255]
  const softWhite: [number,number,number] = [230,230,235]

  // Load template if available
  let templateData: { data: string; fmt: string } | null = null
  if (templatePath && fs.existsSync(templatePath)) {
    try {
      const ext = path.extname(templatePath).toLowerCase()
      const buf = fs.readFileSync(templatePath)
      templateData = { data: buf.toString('base64'), fmt: ext === '.png' ? 'PNG' : 'JPEG' }
    } catch (e) { console.error('Error al cargar plantilla:', e) }
  }

  const usingTemplate = templateData !== null

  if (usingTemplate) {
    doc.addImage(templateData!.data, templateData!.fmt, 0, 0, pw, ph)
  } else {
    doc.setFillColor(...light); doc.rect(0,0,pw,ph,'F')
    doc.setFillColor(...accent); doc.rect(0,0,pw,5,'F')
  }

  let y = usingTemplate ? 52 : 18

  // Precargar logo optimizado (solo si no se usa template)
  let logoData: { data: string; fmt: string } | null = null
  if (!usingTemplate && company?.logoPath && fs.existsSync(company.logoPath)) {
    logoData = await optimizeImage(company.logoPath, 400, 80)
  }

  // Header: logo + nombre empresa (solo sin plantilla)
  if (!usingTemplate && company?.name) {
    if (logoData) {
      try {
        const p = doc.getImageProperties(logoData.data)
        const ar = p.width / p.height
        const logoW = 72; const logoH = logoW / ar
        doc.addImage(logoData.data, logoData.fmt, M, y, logoW, logoH)
        y += logoH + 4
      } catch {}
    }
    doc.setFontSize(18); doc.setTextColor(...dark)
    doc.text(company.name, M, y)
    y += 10
  }

  // Company info line: siempre visible en posición fija
  const ciParts: string[] = []
  if (company?.ruc) ciParts.push(`RUC: ${company.ruc}`)
  if (company?.phone) ciParts.push(`Tel: ${company.phone}`)
  if (company?.website) ciParts.push(company.website)
  if (ciParts.length > 0) {
    doc.setFontSize(7.5); doc.setTextColor(...(usingTemplate ? accent : gray))
    doc.text(ciParts.join(' | '), pw - 18, 36.1, { align: 'right' })
  }

  const dateStr = new Date(date).toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'})
  const validDate = new Date(new Date(date).getTime() + params.validDays*86400000)
  const validStr = validDate.toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'})

  doc.setFontSize(18); doc.setTextColor(...accent)
  doc.text('PROFORMA', M, y+6)
  doc.setFontSize(9); doc.setTextColor(...(usingTemplate ? accent : gray))
  doc.text(proformaNum, M, y+14)
  y += 22

  doc.setFontSize(8); doc.setTextColor(...(usingTemplate ? accent : gray))
  if (usingTemplate) {
    doc.text(`Fecha: ${dateStr}`, pw - M, y - 6, { align: 'right' })
    doc.text(`Válida hasta: ${validStr}`, pw - M, y, { align: 'right' })
  } else {
    doc.text(`Fecha: ${dateStr}`, M, y-6)
    doc.text(`Válida hasta: ${validStr}`, M, y)
  }
  y += 6

  doc.setDrawColor(...accent); doc.setLineWidth(0.5); doc.line(M,y,pw-M,y); y += 8

  // Client block
  doc.setFillColor(...white); doc.roundedRect(M,y,cw/2-4,isGeneralClient ? 22 : 28,3,3,'F')
  doc.setFontSize(7); doc.setTextColor(...accent); doc.text('FACTURAR A', M+4, y+6)
  doc.setFontSize(10); doc.setTextColor(...dark); doc.text(client?.name || 'Cliente General', M+4, y+14)
  if(clientCity){ doc.setFontSize(8); doc.setTextColor(...gray); doc.text(clientCity, M+4, y+20) }
  if(!isGeneralClient && client?.company){ doc.setFontSize(8); doc.setTextColor(...gray); doc.text(client.company, M+4, y+20) }
  if(!isGeneralClient && client?.email){ doc.setFontSize(7); doc.setTextColor(...gray); doc.text(client.email, M+4, y+26) }
  y += isGeneralClient ? 30 : 36

  // Items table
  doc.setFillColor(...accent); doc.rect(M,y,cw,7,'F')
  doc.setFontSize(7); doc.setTextColor(...white)
  doc.text('DESCRIPCIÓN', M+3, y+4.5)
  doc.text('CATEGORÍA', M+95, y+4.5)
  doc.text('CANT.', M+130, y+4.5)
  doc.text('P. UNIT.', M+145, y+4.5)
  doc.text('TOTAL', pw-M-3, y+4.5, {align:'right'})
  y += 8

  let alt = false
  for(const item of items) {
    const rowH = 7
    doc.setFillColor(...(alt?[240,240,248]as[number,number,number]:white))
    doc.rect(M,y,cw,rowH,'F')
    doc.setFontSize(8); doc.setTextColor(...dark)
    const desc = item.description.length>42?item.description.substring(0,40)+'…':item.description
    doc.text(desc, M+3, y+4.8)
    doc.setTextColor(...gray); doc.setFontSize(7)
    doc.text(item.category||'—', M+95, y+4.8)
    doc.text(String(item.quantity), M+137, y+4.8, {align:'center'})
    doc.text(`$${item.price.toFixed(2)}`, M+155, y+4.8, {align:'right'})
    doc.setTextColor(...dark); doc.setFontSize(8)
    doc.text(`$${(item.quantity*item.price).toFixed(2)}`, pw-M-3, y+4.8, {align:'right'})
    alt=!alt; y+=rowH
  }

  // Subtotal / Total
  doc.setDrawColor(...gray); doc.setLineWidth(0.3); doc.line(M,y,pw-M,y); y+=5
  doc.setFontSize(9); doc.setTextColor(...dark)
  doc.text('Subtotal:', M, y)
  doc.text(`$${total.toFixed(2)}`, pw-M-3, y, {align:'right'})
  y+=6
  doc.setFillColor(...accent); doc.roundedRect(M,y,cw,11,2,2,'F')
  doc.setFontSize(11); doc.setTextColor(...white)
  doc.text('TOTAL', M+8, y+7.5)
  doc.text(`$${total.toFixed(2)}`, pw-M-8, y+7.5, {align:'right'})
  y+=18

  // Notes
  if(notes) {
    doc.setFontSize(7); doc.setTextColor(...accent); doc.text('NOTAS Y CONDICIONES', M, y); y+=5
    doc.setFontSize(7.5); doc.setTextColor(...gray)
    const ls = doc.splitTextToSize(notes, cw)
    doc.text(ls, M, y); y += ls.length*3.5+5
  }

  // Signature line (only for registered clients)
  if (!isGeneralClient) {
    const sigY = ph-40
    doc.setDrawColor(...gray); doc.setLineWidth(0.3)
    doc.line(M, sigY, M+70, sigY)
    doc.setFontSize(7); doc.setTextColor(...gray)
    doc.text('Firma del cliente', M, sigY+5)
    doc.text('Fecha: ___________', M+80, sigY+5)
  }

  // Footer
  if (usingTemplate) {
    doc.setFontSize(7); doc.setTextColor(...softWhite)
    doc.text(company?.name || 'Design Reports', M, ph-6)
    doc.text(proformaNum, pw/2, ph-6, {align:'center'})
    doc.text(`Válida hasta ${validStr}`, pw-M, ph-6, {align:'right'})
  } else {
    doc.setFillColor(...accent); doc.rect(0,ph-14,pw,14,'F')
    doc.setFontSize(7); doc.setTextColor(...white)
    doc.text(company?.name || 'Design Reports', M, ph-6)
    doc.text(proformaNum, pw/2, ph-6, {align:'center'})
    doc.text(`Válida hasta ${validStr}`, pw-M, ph-6, {align:'right'})
  }

  fs.writeFileSync(outputPath, Buffer.from(doc.output('arraybuffer')))
}
