const express = require('express');
const bodyParser = require('body-parser');
const printer = require('pdf-to-printer');
const cors = require('cors');
const PDFDocument = require('pdfkit'); // PDF fayl yaratish uchun

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

// Printerlar ro'yxatini olish
app.get('/printers', async (req, res) => {
  try {
    const printers = await printer.getPrinters();
    res.json(printers);
  } catch (error) {
    console.error('Printerlarni olishda xatolik:', error);
    res.status(500).json({ error: 'Printerlarni olishda xatolik' });
  }
});

// Chop etish funksiyasi
app.post('/print', async (req, res) => {
  const { printer: selectedPrinter, content } = req.body;

  if (!selectedPrinter || !content) {
    return res.status(400).json({ error: 'Printer yoki content yetarli emas' });
  }

  try {
    // Buffer orqali PDF yaratish
    const doc = new PDFDocument({
      size: [226.77, 841.89], // 80mm kenglik va uzun qog'oz formati (1mm = 2.83465pt)
      margins: { top: 10, bottom: 10, left: 10, right: 10 },
    });

    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      try {
        const pdfData = Buffer.concat(buffers);

        // PDF faylni printerga yuborish
        await printer.print(pdfData, { printer: selectedPrinter });

        res.json({ message: 'Chek muvaffaqiyatli chiqarildi!' });
      } catch (error) {
        console.error('Chop etishda xatolik:', error);
        res.status(500).json({ error: 'Chop etishda xatolik yuz berdi' });
      }
    });

    // Chek matnini PDF formatga yozish
    doc.fontSize(12).font('Helvetica-Bold').text(`Sana: ${content.dateTime}`);
    doc.text(`Ism: ${content.user?.name || 'Noma’lum'}`);
    doc.text(`Familiya: ${content.user?.surname || 'Noma’lum'}`);
    doc.text(`Yosh: ${content.user?.age || 'Noma’lum'}`);
    doc.text(`Manzil: ${content.user?.address || 'Noma’lum'}`);
    doc.moveDown();
    doc.text('Tanlangan mahsulotlar:', { underline: true });

    content.products.forEach((product) => {
      doc.text(` - ${product.treatmentName}: ${product.price} so'm`);
    });

    doc.moveDown();
    doc.text('Haridingiz uchun rahmat! 😊', {
      align: 'center',
      font: 'Helvetica-Bold',
    });

    doc.end();
  } catch (error) {
    console.error('PDF yaratishda xatolik:', error);
    res.status(500).json({ error: 'PDF yaratishda xatolik yuz berdi' });
  }
});

// Serverni ishga tushirish
app.listen(PORT, () => {
  console.log(`Server ishga tushdi: http://localhost:${PORT}`);
});
