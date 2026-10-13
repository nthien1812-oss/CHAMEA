import Script from "next/script";

export default function StorefrontPage() {
  return (
    <>
      <a className="skip" href="#main">Chuyển đến nội dung</a>
      <div className="announcement">CHAMÉA — Chạm đúng người · Trao đúng quà</div>
      <header id="header" />
      <main id="main" tabIndex={-1} aria-live="polite">
        <div className="container section"><p>Đang tải CHAMÉA…</p></div>
      </main>
      <footer id="footer" />
      <dialog id="panel" aria-labelledby="panel-title" />
      <dialog id="zoom" aria-label="Phóng to ảnh sản phẩm" />
      <div id="toast" role="status" aria-live="polite" />
      <noscript>Vui lòng bật JavaScript để xem website CHAMÉA.</noscript>
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}
