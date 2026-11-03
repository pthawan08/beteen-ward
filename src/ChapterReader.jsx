import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// โหลดไฟล์ครั้งเดียวต่อ URL แล้วใช้ซ้ำทุกบท (PDF แบบ linearized จะดึงเฉพาะหน้าที่เปิด)
const docCache = {};
function loadPdf(url) {
  if (!docCache[url]) {
    docCache[url] = pdfjsLib.getDocument({ url, disableAutoFetch: true, rangeChunkSize: 262144 }).promise;
    docCache[url].catch(() => { delete docCache[url]; });
  }
  return docCache[url];
}

const ZOOM_LEVELS = [1, 1.5, 2];

// อ่านหนังสือทีละบท: แสดงเฉพาะหน้า startPage..endPage ของบทที่เลือก
// ถ้าไม่ระบุ endPage จะอ่านได้ถึงหน้าสุดท้ายของไฟล์
export default function ChapterReader({ pdfUrl, label, title, startPage = 1, endPage: endPageProp, onClose, onMarkTaught }) {
  const [page, setPage] = useState(startPage);
  const [numPages, setNumPages] = useState(null);
  const endPage = endPageProp || numPages || startPage;
  const [status, setStatus] = useState('loading');
  const [zoomIdx, setZoomIdx] = useState(0);
  const canvasRef = useRef(null);
  const scrollRef = useRef(null);
  const touchStartX = useRef(null);

  const totalPages = endPage - startPage + 1;
  const pageInChapter = page - startPage + 1;

  useEffect(() => {
    let cancelled = false;
    let renderTask = null;

    (async () => {
      setStatus('loading');
      try {
        const doc = await loadPdf(pdfUrl);
        if (!cancelled) setNumPages(doc.numPages);
        const pdfPage = await doc.getPage(page);
        if (cancelled) return;

        const canvas = canvasRef.current;
        const containerWidth = scrollRef.current.clientWidth - 16;
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const cssScale = (containerWidth / baseViewport.width) * ZOOM_LEVELS[zoomIdx];
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const viewport = pdfPage.getViewport({ scale: cssScale * dpr });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;

        renderTask = pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport });
        await renderTask.promise;
        if (!cancelled) {
          setStatus('ready');
          scrollRef.current.scrollTo({ top: 0 });
        }
      } catch (err) {
        if (!cancelled && err?.name !== 'RenderingCancelledException') {
          console.error(err);
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdfUrl, page, zoomIdx]);

  const goPrev = () => setPage(p => Math.max(startPage, p - 1));
  const goNext = () => setPage(p => Math.min(endPage, p + 1));

  const handleTouchStart = (e) => {
    touchStartX.current = zoomIdx === 0 ? e.touches[0].clientX : null;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -60) goNext();
    if (dx > 60) goPrev();
    touchStartX.current = null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col text-left">
      <div className="bg-white px-4 py-3 flex items-center gap-3 shadow">
        <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold shrink-0" aria-label="ปิด">
          ✕
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-amber-700">{label}</p>
          <h2 className="text-sm font-extrabold text-slate-800 truncate">{title}</h2>
        </div>
        <button
          type="button"
          onClick={() => setZoomIdx((zoomIdx + 1) % ZOOM_LEVELS.length)}
          className="px-3 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold shrink-0"
        >
          🔍 {ZOOM_LEVELS[zoomIdx]}x
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-auto p-2 relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas ref={canvasRef} className={`mx-auto bg-white rounded shadow-lg ${status === 'ready' ? '' : 'opacity-40'}`} />
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-semibold animate-pulse">
            กำลังเปิดหน้า {pageInChapter}...
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white text-sm p-6 text-center">
            <p>เปิดหน้านี้ไม่ได้ ลองเช็กอินเทอร์เน็ตแล้วกดใหม่อีกครั้งนะ</p>
            <a href={`${pdfUrl}#page=${page}`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-amber-500 rounded-xl font-bold">
              เปิดไฟล์ทั้งเล่มแทน
            </a>
          </div>
        )}
      </div>

      <div className="bg-white px-4 pt-3 pb-4 space-y-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={goPrev} disabled={page === startPage} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm disabled:opacity-40">
            ◀ ก่อนหน้า
          </button>
          <div className="text-center px-2 shrink-0">
            <p className="text-sm font-extrabold text-slate-800">{pageInChapter} / {totalPages}</p>
            <p className="text-[10px] text-slate-400">หน้า {page} ในเล่ม</p>
          </div>
          <button type="button" onClick={goNext} disabled={page === endPage} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm disabled:opacity-40">
            ถัดไป ▶
          </button>
        </div>
        {onMarkTaught && page === endPage && (
          <button type="button" onClick={onMarkTaught} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm">
            ☑️ สอนบทนี้กับน้องแล้ว (ไปหน้าบันทึก)
          </button>
        )}
      </div>
    </div>
  );
}
