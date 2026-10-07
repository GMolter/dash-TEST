import { useState } from 'react';
import { QrCode, Download } from 'lucide-react';

export function QRCodeGenerator() {
  const [text, setText] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const generateQRCode = () => {
    if (!text) return;

    const encoded = encodeURIComponent(text);
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`;
    setQrCodeUrl(url);
  };

  const downloadQRCode = async () => {
    if (!qrCodeUrl) return;

    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'qrcode.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download QR code');
    }
  };

  return (
    <div className="utility-workspace glass-panel mx-auto max-w-5xl rounded-[2rem] p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
        <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
          <QrCode className="w-5 h-5" />
          QR Code Generator
        </h2>
      </div>
      <p className="-mt-3 mb-6 max-w-2xl text-sm leading-relaxed text-slate-400">Turn a link or a little text into a scannable, downloadable code.</p>

      <div className="grid items-stretch gap-5 md:grid-cols-2">
        <div className="p-4 border border-white/10 bg-slate-950/30 rounded-2xl">
          <textarea
            placeholder="Enter text or URL to generate QR code..."
            aria-label="Enter text or URL to generate QR code..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/40 resize-none"
            rows={6}
          />
          <button
            onClick={generateQRCode}
            disabled={!text.trim()}
            className="w-full mt-2 px-4 py-2 bg-violet-500 hover:bg-violet-400 rounded-lg text-white font-medium transition-colors"
          >
            Generate QR Code
          </button>
        </div>

        {qrCodeUrl && (
          <div className="p-4 border border-white/10 bg-slate-950/30 rounded-2xl flex flex-col items-center gap-4">
            <div className="max-w-full bg-white p-4 rounded-xl">
              <img src={qrCodeUrl} alt="QR Code" className="h-auto w-64 max-w-full" />
            </div>
            <button
              onClick={downloadQRCode}
              className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-400 rounded-lg text-white font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Download QR Code
            </button>
          </div>
        )}

        {!qrCodeUrl && (
          <div className="flex flex-col items-center justify-center p-8 border border-dashed border-white/10 bg-slate-950/30 rounded-2xl text-center">
            <QrCode className="w-16 h-16 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Enter text above and click generate to create a QR code</p>
          </div>
        )}
      </div>
    </div>
  );
}
